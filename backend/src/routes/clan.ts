import { Router } from 'express';
import { prisma } from '../prisma';

export const clanRouter = Router();

// Создание клана
clanRouter.post('/create', async (req, res) => {
  try {
    const { vkId, name, description } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (user.clanId) {
      return res.status(400).json({ error: 'Вы уже состоите в клане' });
    }
    
    const clan = await prisma.clan.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
    
    // Привязываем пользователя к клану
    await prisma.user.update({
      where: { id: user.id },
      data: { clanId: clan.id, clanRole: 'owner' }
    });
    
    res.json(clan);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение списка кланов
clanRouter.get('/', async (req, res) => {
  try {
    const clans = await prisma.clan.findMany({
      include: {
        members: {
          include: { user: true }
        }
      },
      orderBy: {
        members: { _count: 'desc' }
      }
    });
    
    res.json(clans);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вступление в клан
clanRouter.post('/join', async (req, res) => {
  try {
    const { vkId, clanId } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (user.clanId) {
      return res.status(400).json({ error: 'Вы уже состоите в клане' });
    }
    
    const clan = await prisma.clan.findUnique({
      where: { id: clanId }
    });
    
    if (!clan) {
      return res.status(404).json({ error: 'Клан не найден' });
    }
    
    await prisma.clanMember.create({
      data: {
        clanId,
        userId: user.id,
        role: 'member'
      }
    });
    
    await prisma.user.update({
      where: { id: user.id },
      data: { clanId, clanRole: 'member' }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение информации о клане
clanRouter.get('/:clanId', async (req, res) => {
  try {
    const { clanId } = req.params;
    
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
    
    if (!clan) {
      return res.status(404).json({ error: 'Клан не найден' });
    }
    
    res.json(clan);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
