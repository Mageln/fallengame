import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { CLAN_MAX_MEMBERS, CLAN_MEMBER_BONUS, CONTRACTS, EMBLEMS, normalizeName, validateName } from '../clanRules.js';
import { requireVkUser, verifyVkLaunch } from '../vkAuth.js';
import { debitClanCreation } from '../clanFunds.js';

export const clanRouter = Router();

class ClanError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const fail = (res: import('express').Response, error: unknown) => {
  if (error instanceof ClanError) return res.status(error.status).json({ error: error.message });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Название занято или запрос уже обработан.' });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Данные изменились. Повторите запрос.' });
  }
  console.error('Clan API error:', error);
  return res.status(500).json({ error: 'Ошибка сервера' });
};

const authenticatedUser = (res: import('express').Response): number => res.locals.vkId as number;

clanRouter.use((req, res, next) => req.method === 'GET' ? next() : requireVkUser(req, res, next));

const detailsInclude = {
  members: { select: { role: true, joinedAt: true, user: { select: { id: true, username: true, avatarUrl: true } } } },
  tasks: true,
  _count: { select: { applications: true } },
} satisfies Prisma.ClanInclude;

type DetailedClan = Prisma.ClanGetPayload<{ include: typeof detailsInclude }>;

const publicClan = (clan: DetailedClan) => ({
  id: clan.id,
  name: clan.name,
  emblem: clan.emblem,
  description: clan.description,
  leaderId: clan.leaderId,
  rating: clan.rating,
  taskPoints: clan.taskPoints,
  createdAt: clan.createdAt,
  members: clan.members.map((member) => ({ id: member.user.id, name: member.user.username ?? 'Выживший', avatarUrl: member.user.avatarUrl, role: member.role, joinedAt: member.joinedAt })),
  applicationsCount: clan._count.applications,
  tasks: clan.tasks.map((task) => ({ taskId: task.taskId, periodKey: task.periodKey, progress: task.progress, completed: !!task.completedAt })),
});

const serializable = async <T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') || attempt === 2) throw error;
    }
  }
  throw new Error('Transaction retries exhausted');
};

// Стоимость списывается на сервере в одной транзакции с созданием убежища.
clanRouter.post('/create', async (req, res) => {
  try {
    const error = validateName(req.body?.name);
    if (error) throw new ClanError(400, error);
    if (!EMBLEMS.includes(req.body?.emblem)) throw new ClanError(400, 'Выберите эмблему.');
    const name = normalizeName(req.body.name);
    const clan = await serializable(async (tx) => {
      const vkId = authenticatedUser(res);
      const progress = await tx.playerProgress.findUnique({ where: { vkId } });
      if (!progress) throw new ClanError(404, 'Сначала загрузите серверный прогресс.');
      const nextState = debitClanCreation(progress.state);
      if (!nextState) throw new ClanError(400, 'Недостаточно припасов: нужно 2500.');
      const user = await tx.user.upsert({ where: { vkId }, create: { vkId }, update: {}, select: { id: true, clanId: true } });
      if (user.clanId) throw new ClanError(409, 'Вы уже состоите в убежище.');
      const debit = await tx.playerProgress.updateMany({
        where: { vkId, revision: progress.revision },
        data: { state: nextState as Prisma.InputJsonValue, revision: { increment: 1 } },
      });
      if (debit.count !== 1) throw new ClanError(409, 'Прогресс изменился. Обновите его и повторите.');
      const created = await tx.clan.create({ data: {
        name, nameKey: name.toLocaleLowerCase('ru-RU'), emblem: req.body.emblem, leaderId: user.id,
        rating: CLAN_MEMBER_BONUS, taskPoints: 0,
        description: 'Новое убежище выживших. Здесь найдётся место тем, кто не сдаётся.',
        members: { create: { userId: user.id, role: 'owner' } },
      } });
      await tx.user.update({ where: { id: user.id }, data: { clanId: created.id, clanRole: 'owner' } });
      return { id: created.id, gold: nextState.gold, revision: progress.revision + 1 };
    });
    res.status(201).json({ message: 'Убежище основано!', ...clan });
  } catch (error) { fail(res, error); }
});

clanRouter.get('/leaderboard', async (req, res) => {
  try {
    if (req.query.sort && req.query.sort !== 'rating') throw new ClanError(400, 'Доступна сортировка только по рейтингу.');
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new ClanError(400, 'Неверные параметры страницы.');
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 50).trim() : '';
    const where = search ? { name: { contains: search, mode: 'insensitive' as const } } : {};
    const [items, total] = await prisma.$transaction([
      prisma.clan.findMany({ where, orderBy: [{ rating: 'desc' }, { name: 'asc' }], skip: (page - 1) * limit, take: limit, include: { _count: { select: { members: true } } } }),
      prisma.clan.count({ where }),
    ]);
    res.json({ items: items.map((clan, index) => ({ rank: (page - 1) * limit + index + 1, id: clan.id, name: clan.name, emblem: clan.emblem, members: clan._count.members, rating: clan.rating })), total, page, limit });
  } catch (error) { fail(res, error); }
});

clanRouter.get('/:clanId', async (req, res) => {
  try {
    const clan = await prisma.clan.findUnique({ where: { id: req.params.clanId }, include: detailsInclude });
    if (!clan) throw new ClanError(404, 'Убежище не найдено.');
    const vkId = verifyVkLaunch(req.header('x-vk-launch-params'), process.env.VK_APP_SECRET);
    const leader = vkId ? await prisma.user.findUnique({ where: { vkId }, select: { id: true } }) : null;
    const applications = leader?.id === clan.leaderId
      ? await prisma.clanApplication.findMany({ where: { clanId: clan.id }, include: { requester: { select: { id: true, username: true } } } })
      : [];
    res.json({ ...publicClan(clan), applications: applications.map((entry) => ({ userId: entry.requester.id, userName: entry.requester.username ?? 'Выживший', createdAt: entry.createdAt })) });
  } catch (error) { fail(res, error); }
});

clanRouter.post('/:clanId/apply', async (req, res) => {
  try {
    const application = await serializable(async (tx) => {
      const user = await tx.user.findUnique({ where: { vkId: authenticatedUser(res) }, select: { id: true, clanId: true } });
      if (!user) throw new ClanError(404, 'Профиль не найден.');
      if (user.clanId) throw new ClanError(409, 'Вы уже состоите в убежище.');
      const clan = await tx.clan.findUnique({ where: { id: req.params.clanId }, include: { _count: { select: { members: true } } } });
      if (!clan) throw new ClanError(404, 'Убежище не найдено.');
      if (clan._count.members >= CLAN_MAX_MEMBERS) throw new ClanError(409, 'В убежище нет мест.');
      return tx.clanApplication.create({ data: { clanId: clan.id, requesterId: user.id } });
    });
    res.status(201).json({ id: application.id, message: 'Заявка отправлена.' });
  } catch (error) { fail(res, error); }
});

clanRouter.post('/:clanId/applications/:userId/resolve', async (req, res) => {
  try {
    if (typeof req.body?.accept !== 'boolean') throw new ClanError(400, 'Укажите решение по заявке.');
    const result = await serializable(async (tx) => {
      const leader = await tx.user.findUnique({ where: { vkId: authenticatedUser(res) }, select: { id: true } });
      const clan = await tx.clan.findUnique({ where: { id: req.params.clanId }, include: { _count: { select: { members: true } } } });
      if (!clan || !leader || clan.leaderId !== leader.id) throw new ClanError(403, 'Только лидер может обработать заявку.');
      const application = await tx.clanApplication.findUnique({ where: { requesterId: req.params.userId } });
      if (!application || application.clanId !== clan.id) throw new ClanError(404, 'Заявка не найдена.');
      if (req.body.accept) {
        if (clan._count.members >= CLAN_MAX_MEMBERS) throw new ClanError(409, 'В убежище нет мест.');
        const updated = await tx.user.updateMany({ where: { id: application.requesterId, clanId: null }, data: { clanId: clan.id, clanRole: 'member' } });
        if (updated.count !== 1) throw new ClanError(409, 'Игрок уже вступил в другую группировку.');
        await tx.clanMember.create({ data: { clanId: clan.id, userId: application.requesterId, role: 'member' } });
        await tx.clan.update({ where: { id: clan.id }, data: { rating: { increment: CLAN_MEMBER_BONUS } } });
      }
      await tx.clanApplication.delete({ where: { id: application.id } });
      return { accepted: req.body.accept, rating: clan.rating + (req.body.accept ? CLAN_MEMBER_BONUS : 0) };
    });
    res.json(result);
  } catch (error) { fail(res, error); }
});

clanRouter.post('/:clanId/tasks/:taskId/progress', async (req, res) => {
  try {
    const contract = CONTRACTS[req.params.taskId as keyof typeof CONTRACTS];
    if (!contract) throw new ClanError(404, 'Контракт не найден.');
    const amount = req.body?.amount;
    const eventId = req.body?.eventId;
    const maxEvent = contract.event === 'medkit' ? 10 : 1;
    if (!Number.isInteger(amount) || amount < 1 || amount > maxEvent || typeof eventId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(eventId)) {
      throw new ClanError(400, 'Неверные данные события.');
    }
    // Untrusted clients cannot prove that a game event happened. Keep this
    // legacy endpoint closed until events are emitted transactionally by gameplay.
    throw new ClanError(501, 'Прогресс контрактов принимается только от серверных игровых событий.');
  } catch (error) { fail(res, error); }
});
