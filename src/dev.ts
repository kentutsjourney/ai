import dotenv from 'dotenv';
import { bot } from './bot.js';

dotenv.config();

console.log('🚀 Memulai bot dalam mode Polling (Development Lokal)...');
console.log('Catatan: Pastikan Webhook Telegram tidak aktif saat menjalankan polling lokal.');

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} berhasil online dan mendengarkan pesan!`);
  },
  drop_pending_updates: true,
});
