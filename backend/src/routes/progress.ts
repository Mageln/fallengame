import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';
import { createInitialState, gameReducer } from '../generated/game.js';
import { parseProgressAction } from '../progressAction.js';

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
      select: { state: true, revision: true },
    });
    return res.json(progress);
  } catch (error) {
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
    const current = await prisma.playerProgress.findUnique({ where: { vkId } });
    if (!current) return res.status(404).json({ error: 'Сначала загрузите сохранение.' });
    if (current.revision !== revision) return res.status(409).json({ error: 'Сохранение изменилось. Загрузите его заново.' });
    const state = gameReducer(current.state as Record<string, unknown>, action);
    const updated = await prisma.playerProgress.updateMany({
      where: { vkId, revision },
      data: { state: state as Prisma.InputJsonValue, revision: { increment: 1 } },
    });
    if (!updated.count) return res.status(409).json({ error: 'Сохранение изменилось. Загрузите его заново.' });
    return res.json({ state, revision: revision + 1 });
  } catch (error) {
    console.error('Progress action error:', error);
    return res.status(500).json({ error: 'Не удалось сохранить действие.' });
  }
});
