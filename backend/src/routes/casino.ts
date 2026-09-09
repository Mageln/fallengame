import { Router } from 'express';
import { prisma } from '../prisma';

export const casinoRouter = Router();

// Игра в монетку
casinoRouter.post('/coinflip', async (req, res) => {
  try {
    const { vkId, betAmount, choice } = req.body; // choice: 'heads' или 'tails'
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
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
    
    // Обновляем баланс
    await prisma.user.update({
      where: { id: user.id },
      data: {
        gold: isWin 
          ? { increment: winnings } 
          : { decrement: betAmount }
      }
    });
    
    // Записываем игру
    await prisma.casinoGame.create({
      data: {
        userId: user.id,
        gameType: 'coinflip',
        betAmount,
        result: isWin ? 'win' : 'lose',
        winnings
      }
    });
    
    res.json({
      result,
      isWin,
      winnings,
      newBalance: user.gold + (isWin ? winnings : -betAmount)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Слоты
casinoRouter.post('/slots', async (req, res) => {
  try {
    const { vkId, betAmount } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
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
    
    // Обновляем баланс
    await prisma.user.update({
      where: { id: user.id },
      data: {
        gold: isWin || isPartialWin
          ? { increment: winnings }
          : { decrement: betAmount }
      }
    });
    
    // Записываем игру
    await prisma.casinoGame.create({
      data: {
        userId: user.id,
        gameType: 'slots',
        betAmount,
        result,
        winnings
      }
    });
    
    res.json({
      slots,
      isWin: result === 'win',
      winnings,
      newBalance: user.gold + (result === 'win' ? winnings : -betAmount)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение истории игр
casinoRouter.get('/history/:vkId', async (req, res) => {
  try {
    const { vkId } = req.params;
    
    const games = await prisma.casinoGame.findMany({
      where: {
        user: { vkId: parseInt(vkId) }
      },
      orderBy: { playedAt: 'desc' },
      take: 50
    });
    
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
