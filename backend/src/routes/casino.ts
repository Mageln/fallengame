import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireVkUser } from '../vkAuth.js';
import { Prisma } from '@prisma/client';

export const casinoRouter = Router();
casinoRouter.use(requireVkUser);

const settleBet = async (userId: string, betAmount: number, winnings: number, gameType: string, result: string): Promise<number | null> => {
  return prisma.$transaction(async (tx) => {
    const debit = await tx.user.updateMany({
      where: { id: userId, gold: { gte: betAmount } },
      data: { gold: { increment: winnings - betAmount } },
    });
    if (debit.count !== 1) return null;
    await tx.casinoGame.create({ data: { userId, gameType, betAmount, result, winnings } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    return user.gold;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

const validBet = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= 1_000_000;

// Игра в монетку
casinoRouter.post('/coinflip', async (req, res) => {
  try {
    const { betAmount, choice } = req.body ?? {};
    if (!validBet(betAmount) || (choice !== 'heads' && choice !== 'tails')) {
      return res.status(400).json({ error: 'Неверная ставка или выбор.' });
    }

    const user = await prisma.user.findUnique({ where: { vkId: res.locals.vkId } });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (user.gold < betAmount) {
      return res.status(400).json({ error: 'Недостаточно золота' });
    }
    
    // Бросаем монетку
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const isWin = choice === result;
    
    const winnings = isWin ? betAmount * 2 : 0;
    
    const newBalance = await settleBet(user.id, betAmount, winnings, 'coinflip', isWin ? 'win' : 'lose');
    if (newBalance === null) return res.status(400).json({ error: 'Недостаточно золота' });
    
    res.json({
      result,
      isWin,
      winnings,
      newBalance
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Слоты
casinoRouter.post('/slots', async (req, res) => {
  try {
    const { betAmount } = req.body ?? {};
    if (!validBet(betAmount)) return res.status(400).json({ error: 'Неверная ставка.' });

    const user = await prisma.user.findUnique({ where: { vkId: res.locals.vkId } });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (user.gold < betAmount) {
      return res.status(400).json({ error: 'Недостаточно золота' });
    }
    
    // Генерируем слоты (3 случайных символа)
    const symbols = ['🍒', '🍋', '💎', '7️⃣', '🦠'];
    const slots = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    // Проверяем выигрыш
    const isWin = slots[0] === slots[1] && slots[1] === slots[2];
    const isPartialWin = slots.filter(s => s === slots[0]).length === 2;
    
    let winnings = 0;
    let result: 'win' | 'lose' = 'lose';
    
    if (isWin) {
      winnings = betAmount * 10;
      result = 'win';
    } else if (isPartialWin) {
      winnings = Math.floor(betAmount * 1.5);
      result = 'win';
    }
    
    const newBalance = await settleBet(user.id, betAmount, winnings, 'slots', result);
    if (newBalance === null) return res.status(400).json({ error: 'Недостаточно золота' });
    
    res.json({
      slots,
      isWin: result === 'win',
      winnings,
      newBalance
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение истории игр
casinoRouter.get('/history/:vkId', async (req, res) => {
  try {
    if (Number(req.params.vkId) !== res.locals.vkId) return res.status(403).json({ error: 'Чужая история недоступна.' });
    const games = await prisma.casinoGame.findMany({
      where: {
        user: { vkId: res.locals.vkId }
      },
      orderBy: { playedAt: 'desc' },
      take: 50
    });
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
