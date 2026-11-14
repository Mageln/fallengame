import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';
import { canModerate, parseBan, staffRole } from '../moderation.js';

export const moderationRouter = Router();
moderationRouter.use(requireVkUser);
moderationRouter.get('/me', (_req, res) => res.json({ role: staffRole(res.locals.vkId) }));
moderationRouter.post('/roles', (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id: unknown) => !Number.isInteger(id) || Number(id) < 1 || Number(id) > 2147483647)) return res.status(400).json({ error: 'Некорректные ID.' });
  return res.json({ roles: Object.fromEntries(ids.map((id: number) => [id, staffRole(id)])) });
});
moderationRouter.post('/ban', async (req, res) => {
  const actor: number = res.locals.vkId;
  const data = parseBan(req.body);
  if (!data) return res.status(400).json({ error: 'Проверьте VK ID, причину и срок блокировки.' });
  if (!canModerate(actor, data.target)) return res.status(403).json({ error: 'Недостаточно прав или выбран сотрудник.' });
  try {
    const exists = await prisma.playerProgress.findUnique({ where: { vkId: data.target }, select: { vkId: true } });
    if (!exists) return res.status(404).json({ error: 'Игрок с таким VK ID не найден в серверных сохранениях.' });
    const expiresAt = data.durationHours === null ? null : new Date(Date.now() + data.durationHours * 3600000);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "PlayerBan" ("vkId", "reason", "expiresAt", "actorVkId") VALUES (${data.target}, ${data.reason}, ${expiresAt}, ${actor}) ON CONFLICT ("vkId") DO UPDATE SET "reason" = EXCLUDED."reason", "expiresAt" = EXCLUDED."expiresAt", "actorVkId" = EXCLUDED."actorVkId", "createdAt" = CURRENT_TIMESTAMP`;
      await tx.$executeRaw`INSERT INTO "ModerationAudit" ("targetVkId", "actorVkId", "action", "reason", "expiresAt") VALUES (${data.target}, ${actor}, 'ban', ${data.reason}, ${expiresAt})`;
    });
    return res.json({ ok: true, expiresAt });
  } catch (error) { console.error('Moderation ban failed:', error); return res.status(503).json({ error: 'Не удалось сохранить блокировку.' }); }
});
moderationRouter.post('/unban', async (req, res) => {
  const actor: number = res.locals.vkId;
  const target = req.body?.targetVkId;
  if (Object.keys(req.body ?? {}).join(',') !== 'targetVkId' || !Number.isInteger(target) || target < 1 || target > 2147483647) return res.status(400).json({ error: 'Некорректный VK ID.' });
  if (!canModerate(actor, target)) return res.status(403).json({ error: 'Недостаточно прав или выбран сотрудник.' });
  try {
    const count = await prisma.$transaction(async (tx) => {
      const deleted = await tx.$executeRaw`DELETE FROM "PlayerBan" WHERE "vkId" = ${target}`;
      if (deleted) await tx.$executeRaw`INSERT INTO "ModerationAudit" ("targetVkId", "actorVkId", "action") VALUES (${target}, ${actor}, 'unban')`;
      return deleted;
    });
    return count ? res.json({ ok: true }) : res.status(404).json({ error: 'Блокировка не найдена.' });
  } catch (error) { console.error('Moderation unban failed:', error); return res.status(503).json({ error: 'Не удалось снять блокировку.' }); }
});
