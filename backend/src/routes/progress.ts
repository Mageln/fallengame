import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';
import { applyDailyReset, createInitialState, normalizeMapRaids } from '../generated/game.js';
import { advanceCombat, applyCombatAction } from '../progressCombat.js';
import { restoreEnergy } from '../progressEnergy.js';
import { parseProgressAction } from '../progressAction.js';
import { claimCoopRewards } from '../coopBoss.js';
import { applyCoopProgressAction, syncCoopBattle } from '../coopProgress.js';

// Explicit rollout gate: the shared-boss migration must be applied first.
const coopEnabled = process.env.COOP_BOSSES_ENABLED === 'true';
class ProgressConflict extends Error {}
class ProgressMissing extends Error {}
class CoopDisabled extends Error {}
type LockedProgress = { state: Record<string, unknown>; revision: number; energyUpdatedAt: Date };
const lockProgress = async (tx: Prisma.TransactionClient, vkId: number): Promise<LockedProgress> => {
  const rows = await tx.$queryRaw<LockedProgress[]>`SELECT "state", "revision", "energyUpdatedAt" FROM "PlayerProgress" WHERE "vkId" = ${vkId} FOR NO KEY UPDATE`;
  if (!rows[0]) throw new ProgressMissing();
  return rows[0];
};
const hasCoopBattle = (state: Record<string, unknown>) => {
  const battle = state.battle as Record<string, unknown> | null;
  return typeof battle?.coopEncounterId === 'string';
};
export const progressRouter = Router();
progressRouter.use(requireVkUser);

// Initial server profiles never import browser data or modify the legacy User balance.
progressRouter.get('/', async (_req, res) => {
  try {
    const vkId: number = res.locals.vkId;
    const initial = { ...createInitialState(), playerId: String(vkId) };
    const progress = await prisma.playerProgress.upsert({
      where: { vkId },
      create: { vkId, state: initial as Prisma.InputJsonValue },
      update: {},
      select: { state: true, revision: true, energyUpdatedAt: true },
    });
    if (!coopEnabled) {
      if (hasCoopBattle(progress.state as Record<string, unknown>)) throw new CoopDisabled();
      const regenerated = restoreEnergy(progress.state as Record<string, unknown>, progress.energyUpdatedAt, new Date());
      return res.json({ state: advanceCombat(normalizeMapRaids(regenerated.state), Date.now()), revision: progress.revision });
    }
    const snapshot = await prisma.$transaction(async (tx) => {
      const locked = await lockProgress(tx, vkId);
      const now = Date.now();
      // Synchronize first while holding the boss lock, then claim its ledger.
      await syncCoopBattle(tx, locked.state, vkId, now);
      const claimed = await claimCoopRewards(tx, vkId);
      const refreshed = restoreEnergy(claimed.state, locked.energyUpdatedAt, new Date(now));
      const state = await syncCoopBattle(tx, advanceCombat(normalizeMapRaids(refreshed.state), now), vkId, now);
      return { state, revision: claimed.revision };
    });
    return res.json(snapshot);
  } catch (error) {
    if (error instanceof CoopDisabled) return res.status(503).json({ error: 'Совместный бой временно недоступен.' });
    console.error('Progress load error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить прогресс.' });
  }
});

// Optimistic concurrency prevents one device from silently overwriting another.
progressRouter.post('/action', async (req, res) => {
  const action = parseProgressAction(req.body?.action);
  const revision = req.body?.revision;
  if (!action || !Number.isSafeInteger(revision) || revision < 0) {
    return res.status(400).json({ error: 'Недопустимое действие или версия сохранения.' });
  }
  try {
    const vkId: number = res.locals.vkId;
    if (coopEnabled) {
      const snapshot = await prisma.$transaction(async (tx) => {
        const current = await lockProgress(tx, vkId);
        if (current.revision !== revision) throw new ProgressConflict();
        const now = new Date();
        const regenerated = restoreEnergy(current.state, current.energyUpdatedAt, now);
        const refreshed = applyDailyReset(regenerated.state);
        const state = await applyCoopProgressAction(tx, refreshed, action, vkId, revision, now.getTime());
        await tx.$executeRaw`
          UPDATE "PlayerProgress" SET "state" = ${JSON.stringify(state)}::jsonb,
            "energyUpdatedAt" = ${regenerated.anchor}, "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "vkId" = ${vkId}
        `;
        const claimed = await claimCoopRewards(tx, vkId);
        const finalState = await syncCoopBattle(tx, claimed.state, vkId, now.getTime());
        return { state: finalState, revision: claimed.revision };
      });
      return res.json(snapshot);
    }
    const current = await prisma.playerProgress.findUnique({ where: { vkId } });
    if (!current) return res.status(404).json({ error: 'Сначала загрузите сохранение.' });
    if (hasCoopBattle(current.state as Record<string, unknown>)) throw new CoopDisabled();
    if (current.revision !== revision) return res.status(409).json({ error: 'Сохранение изменилось. Загрузите его заново.' });
    const now = new Date();
    const regenerated = restoreEnergy(current.state as Record<string, unknown>, current.energyUpdatedAt, now);
    const refreshed = applyDailyReset(regenerated.state);
    const state = applyCombatAction(refreshed, action, now.getTime());
    const updated = await prisma.playerProgress.updateMany({
      where: { vkId, revision },
      data: { state: state as Prisma.InputJsonValue, energyUpdatedAt: regenerated.anchor, revision: { increment: 1 } },
    });
    if (!updated.count) return res.status(409).json({ error: 'Сохранение изменилось. Загрузите его заново.' });
    return res.json({ state, revision: revision + 1 });
  } catch (error) {
    if (error instanceof ProgressConflict) return res.status(409).json({ error: 'Сохранение изменилось. Загрузите его заново.' });
    if (error instanceof ProgressMissing) return res.status(404).json({ error: 'Сначала загрузите сохранение.' });
    if (error instanceof CoopDisabled) return res.status(503).json({ error: 'Совместный бой временно недоступен.' });
    console.error('Progress action error:', error);
    return res.status(500).json({ error: 'Не удалось сохранить действие.' });
  }
});
