import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';

export const userRouter = Router();

// Получение профиля пользователя
userRouter.get('/:vkId', async (req, res) => {
  try {
    const { vkId } = req.params;
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) },
      include: {
        weapons: true,
        inventory: true,
        clothing: true,
        clan: {
          include: {
            members: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!user) {
      // Создаём нового пользователя, если не найден
      const newUser = await prisma.user.create({
        data: { vkId: parseInt(vkId) }
      });
      return res.json(newUser);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Данные профиля можно менять только от имени подписанного пользователя.
// Ресурсы и членство в клане меняют только игровые серверные операции.
userRouter.put('/:vkId', requireVkUser, async (req, res) => {
  try {
    if (Number(req.params.vkId) !== res.locals.vkId) return res.status(403).json({ error: 'Чужой профиль недоступен.' });
    const keys = Object.keys(req.body ?? {});
    if (!keys.length || keys.some((key) => key !== 'username' && key !== 'avatarUrl')) {
      return res.status(400).json({ error: 'Можно изменить только имя и аватар.' });
    }
    const { username, avatarUrl } = req.body;
    if ((username !== undefined && (typeof username !== 'string' || username.length > 80)) ||
        (avatarUrl !== undefined && (typeof avatarUrl !== 'string' || avatarUrl.length > 500))) {
      return res.status(400).json({ error: 'Некорректные данные профиля.' });
    }
    const user = await prisma.user.update({
      where: { vkId: res.locals.vkId },
      data: { ...(username !== undefined ? { username } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение топ игроков
userRouter.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      take: 100,
      orderBy: {
        authority: 'desc'
      },
      select: {
        id: true,
        vkId: true,
        username: true,
        avatarUrl: true,
        level: true,
        authority: true
      }
    });
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
