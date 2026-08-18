import { webhookCallback } from 'grammy';
import { bot } from '../src/bot.js';

// Vercel Serverless Function entry point
export default async function handler(req: any, res: any) {
  // 1. Health check jika dibuka via browser (GET)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      message: 'Telegram Bot AI Webhook endpoint is running properly!',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Hanya izinkan method POST dari Telegram
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // 3. Verifikasi Secret Token jika disetel di environment
  const secretToken = process.env.SECRET_TOKEN;
  if (secretToken) {
    const telegramHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (telegramHeader !== secretToken) {
      console.warn('⚠️ Request webhook ditolak: Secret token tidak cocok.');
      return res.status(403).json({ error: 'Unauthorized webhook request' });
    }
  }

  try {
    // 4. Gunakan adapter webhookCallback dari grammY untuk format standar HTTP (Vercel)
    const callback = webhookCallback(bot, 'http');
    return await callback(req, res);
  } catch (err: any) {
    console.error('❌ Error handling webhook callback:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
