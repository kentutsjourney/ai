import { webhookCallback } from 'grammy';
import { bot } from '../src/bot.js';

// Cache untuk mencegah duplikasi pemrosesan update akibat retry dari Telegram
const processedUpdates = new Set<number>();

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

  // 4. Cegah double-reply akibat retry Telegram jika pesan yang sama dikirim ulang
  const updateId = req.body?.update_id;
  if (updateId) {
    if (processedUpdates.has(updateId)) {
      return res.status(200).json({ ok: true, note: 'Duplicate update ignored' });
    }
    processedUpdates.add(updateId);
    if (processedUpdates.size > 200) {
      const first = processedUpdates.values().next().value;
      if (first !== undefined) processedUpdates.delete(first);
    }
  }

  try {
    // 5. Gunakan adapter webhookCallback dari grammY
    const callback = webhookCallback(bot, 'http', {
      timeoutMilliseconds: 25000,
    });
    return await callback(req, res);
  } catch (err: any) {
    console.error('❌ Error handling webhook callback:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
