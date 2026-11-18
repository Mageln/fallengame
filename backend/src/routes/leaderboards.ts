import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';
import { leaderboardsEnabled, weekStart } from '../leaderboards.js';

type Row = { vkId: number; name: string; score: bigint; position: bigint };
export const leaderboardRouter = Router();
leaderboardRouter.use(requireVkUser);
leaderboardRouter.get('/', async (req, res) => {
  if (!leaderboardsEnabled()) return res.status(503).json({ error: 'Рейтинг пока не включён на сервере.' });
  const kind = req.query.kind;
  const range = req.query.period;
  if ((kind !== 'boss' && kind !== 'arena') || (range !== 'week' && range !== 'all')) return res.status(400).json({ error: 'Неверные параметры рейтинга.' });
  const period = range === 'week' ? weekStart(new Date()) : 'all';
  try {
    // Rank by score, then VK ID for deterministic ties; include your own row below the top 50.
    const rows = await prisma.$queryRaw<Row[]>`
      WITH scores AS (
        SELECT s."vkId", LEFT(COALESCE(NULLIF(u."username", ''), 'Игрок VK ' || s."vkId"::text), 80) AS name,
          CASE WHEN ${kind}::text = 'boss' THEN s."bossDamage" ELSE s."arenaWins" END AS score
        FROM "LeaderboardScore" s LEFT JOIN "User" u ON u."vkId" = s."vkId"
        WHERE s."period" = ${period}
      ), ranked AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC, "vkId" ASC) AS position FROM scores WHERE score > 0
      ) SELECT * FROM ranked WHERE position <= 50 OR "vkId" = ${res.locals.vkId as number} ORDER BY position`;
    const entries = rows.map(row => ({ vkId: row.vkId, name: row.name, score: row.score.toString(), position: Number(row.position) }));
    return res.json({ kind, period: range, weekStart: range === 'week' ? period : null, entries: entries.filter(e => e.position <= 50), me: entries.find(e => e.vkId === res.locals.vkId) ?? null });
  } catch (error) {
    console.error('Leaderboard query failed:', error);
    return res.status(503).json({ error: 'Рейтинг временно недоступен.' });
  }
});
