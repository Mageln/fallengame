import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export const verifyVkLaunch = (raw: string | undefined, secret: string | undefined, now = Date.now()): number | null => {
  if (!raw || raw.length > 4096 || !secret) return null;
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const sign = params.get('sign');
  const vkId = Number(params.get('vk_user_id'));
  const issuedAt = Number(params.get('vk_ts'));
  if (!sign || !Number.isSafeInteger(vkId) || vkId < 1 || !Number.isSafeInteger(issuedAt) ||
    Math.abs(now / 1000 - issuedAt) > 86400) return null;
  if (process.env.VK_APP_ID && params.get('vk_app_id') !== process.env.VK_APP_ID) return null;

  const signed = new URLSearchParams([...params.entries()].filter(([key]) => key.startsWith('vk_')));
  signed.sort();
  const expected = createHmac('sha256', secret).update(signed.toString()).digest('base64url');
  const received = Buffer.from(sign);
  const actual = Buffer.from(expected);
  return received.length === actual.length && timingSafeEqual(received, actual) ? vkId : null;
};

export const requireVkUser: RequestHandler = (req, res, next) => {
  const secret = process.env.VK_APP_SECRET;
  if (!secret) { res.status(503).json({ error: 'Авторизация VK не настроена.' }); return; }
  const vkId = verifyVkLaunch(req.header('x-vk-launch-params'), secret);
  if (!vkId) { res.status(401).json({ error: 'Недействительные параметры запуска VK.' }); return; }
  res.locals.vkId = vkId;
  next();
};
