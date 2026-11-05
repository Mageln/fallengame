import { Router } from 'express';

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

// Payment must not grant anything until VK payment confirmation is implemented.
// This route is intentionally disabled in every environment, including local WSL.
shopRouter.post('/purchase', (_req, res) => {
  return res.status(501).json({ error: 'Покупка недоступна до подключения подтверждения оплаты VK.' });
});
