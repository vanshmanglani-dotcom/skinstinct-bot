import { waitUntil } from '@vercel/functions';
import { processUpdate } from '../lib/pipeline.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Webhook is up. Telegram sends POST requests here.');

  // Only accept requests that carry the secret we gave Telegram in setWebhook.
  const secret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return res.status(401).json({ ok: false, error: 'bad secret token' });
  }

  const update = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // Answer Telegram immediately (so it doesn't retry), keep working in the background.
  res.status(200).json({ ok: true });
  waitUntil(processUpdate(update).catch((e) => console.error('Unhandled error:', e)));
}
