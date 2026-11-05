import { Router } from 'express';
import { paymentProducts } from '../paymentCatalog.js';

export const shopRouter = Router();

// Public preview of server-defined products; no payment credentials are exposed.
shopRouter.get('/products', (_req, res) => {
  res.json(paymentProducts);
});

// A browser request is not proof of payment. Disabled in every environment until
// VK callbacks are verified and fulfillment is idempotent and transactional.
shopRouter.post('/purchase', (_req, res) => {
  return res.status(501).json({ error: 'Покупка недоступна до подключения подтверждения оплаты VK.' });
});
