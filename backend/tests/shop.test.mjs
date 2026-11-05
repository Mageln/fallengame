import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { shopRouter } from '../dist/routes/shop.js';

test('unverified purchases cannot mint currency in any environment', async () => {
  const app = express();
  app.use(express.json());
  app.use('/shop', shopRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/shop/purchase`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vkId: 123, productId: 'gold_100' }),
    });
    assert.equal(response.status, 501);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
