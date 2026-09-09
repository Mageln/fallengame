import { Router } from 'express';
import { prisma } from '../prisma';

export const shopRouter = Router();

// Получение доступных товаров
shopRouter.get('/products', async (req, res) => {
  try {
    const products = [
      {
        id: 'gold_100',
        name: '100 Золота',
        type: 'currency',
        currency: 'gold',
        amount: 100,
        priceRub: 10
      },
      {
        id: 'matches_1',
        name: 'Пачка спичек',
        type: 'resource',
        resource: 'matches',
        amount: 1,
        priceRub: 5
      },
      {
        id: 'bullets_10',
        name: '10 Пуль',
        type: 'resource',
        resource: 'bullets',
        amount: 10,
        priceRub: 15
      },
      {
        id: 'energy_50',
        name: '50 Энергии',
        type: 'resource',
        resource: 'energy',
        amount: 50,
        priceRub: 20
      },
      {
        id: 'tokens_5',
        name: '5 Жетонов',
        type: 'resource',
        resource: 'tokens',
        amount: 5,
        priceRub: 25
      }
    ];
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Покупка товара через VK Pay
shopRouter.post('/purchase', async (req, res) => {
  try {
    const { vkId, productId } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // В реальной интеграции здесь будет вызов VK Pay для создания платежа
    // const vkPayResult = await vkPay.createPayment({
    //   merchants: '...',
    //   amount: '...',
    //   items: [...]
    // });
    
    // Для демо просто начисляем ресурсы
    const products: Record<string, any> = {
      'gold_100': { currency: 'gold', amount: 100 },
      'matches_1': { resource: 'matches', amount: 1 },
      'bullets_10': { resource: 'bullets', amount: 10 },
      'energy_50': { resource: 'energy', amount: 50 },
      'tokens_5': { resource: 'tokens', amount: 5 }
    };
    
    const product = products[productId];
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    // Начисляем ресурсы
    const updateData: any = {};
    if (product.currency) {
      updateData[product.currency] = { increment: product.amount };
    } else if (product.resource) {
      updateData[product.resource] = { increment: product.amount };
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
