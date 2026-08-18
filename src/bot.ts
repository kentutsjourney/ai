import { Bot, Context } from 'grammy';
import dotenv from 'dotenv';
import { saveChatMessage, getLastMediaInChat } from './supabase.js';
import { generateAIResponse } from './ai.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN harus didefinisikan di environment variable!');
}

export const bot = new Bot(token);

// Cache username bot
let botUsername = process.env.BOT_USERNAME?.replace(/^@/, '').toLowerCase() || '';

// Inisialisasi info bot saat startup jika belum ada
bot.init().then(() => {
  if (!botUsername && bot.botInfo.username) {
    botUsername = bot.botInfo.username.toLowerCase();
    console.log(`🤖 Bot terhubung sebagai @${botUsername}`);
  }
}).catch((err) => {
  console.warn('⚠️ Warning bot.init() startup:', err.message);
});

/**
 * Helper untuk mengecek apakah pengirim pesan adalah Admin / Creator di grup
 */
async function isUserAdmin(ctx: Context, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await ctx.api.getChatMember(chatId, userId);
    return member.status === 'administrator' || member.status === 'creator';
  } catch (err) {
    console.error('❌ Gagal memeriksa status admin:', err);
    return false;
  }
}

// ==========================================================
// COMMAND HANDLERS
// ==========================================================

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Yo bro! 🤙 Gue asisten AI tongkrongan lu.\n\n` +
    `Lu bisa ngobrol santai ama gue di sini, atau masukin gue ke grup tongkrongan lu.\n` +
    `Tinggal mention @${botUsername || 'nama_bot'} atau reply chat gue, nanti gue sautin pake gaya santuy!\n\n` +
    `⚠️ *Catatan Grup*: Di dalam grup, cuma *Admin Grup* yang bisa nyuruh-nyuruh AI ini ya!`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📌 *Cara Make Bot Ini:*\n\n` +
    `1. *Ngobrol*: Mention @${botUsername || 'bot'} atau reply pesan gue (Khusus Admin di grup).\n` +
    `2. *Tanya Langsung*: Ketik \`/ask <pertanyaan>\`\n` +
    `3. *Media Recall*: Ketik \`/getmedia\` buat narik media/foto terakhir yang pernah dikirim di grup ini.\n` +
    `4. *Memory*: Tenang, gue otomatis inget 5 obrolan terakhir biar nyambung!\n\n` +
    `👑 *Role*: Di grup, fitur interaksi AI hanya aktif untuk *Admin / Owner* grup.`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('getmedia', async (ctx) => {
  const chat = ctx.chat;
  if (!chat) return;

  const chatId = chat.id;
  const isPrivate = chat.type === 'private';
  const senderId = ctx.from?.id || 0;

  // Verifikasi admin jika di grup
  if (!isPrivate) {
    const isAdmin = await isUserAdmin(ctx, chatId, senderId);
    if (!isAdmin) {
      await ctx.reply('⛔ Fitur recall media di grup cuma bisa dipake sama *Admin Grup* ya bray! 😜', {
        reply_to_message_id: ctx.message?.message_id,
        parse_mode: 'Markdown',
      });
      return;
    }
  }

  await ctx.replyWithChatAction('upload_photo');

  const lastMedia = await getLastMediaInChat(chatId);
  if (!lastMedia || !lastMedia.media_file_id) {
    await ctx.reply('Belum ada riwayat foto/media yang tersimpan di chat ini, bray!');
    return;
  }

  try {
    const sender = lastMedia.username ? `@${lastMedia.username}` : 'Seseorang';
    const caption = `📸 Nih media terakhir dari ${sender} yang tersimpan di memory!\n${lastMedia.message_text ? `Caption: "${lastMedia.message_text}"` : ''}`;

    if (lastMedia.media_type === 'photo') {
      await ctx.replyWithPhoto(lastMedia.media_file_id, { caption });
    } else if (lastMedia.media_type === 'video') {
      await ctx.replyWithVideo(lastMedia.media_file_id, { caption });
    } else if (lastMedia.media_type === 'document') {
      await ctx.replyWithDocument(lastMedia.media_file_id, { caption });
    } else {
      await ctx.reply(`Media ID tersimpan (${lastMedia.media_type}): ${lastMedia.media_file_id}`);
    }
  } catch (err: any) {
    console.error('❌ Gagal mengirim kembali media:', err);
    await ctx.reply('Gagal narik media dari server Telegram bro, mungkin udah kadaluarsa.');
  }
});

// ==========================================================
// MESSAGE INTERCEPTOR & AI TRIGGER LOGIC
// ==========================================================

bot.on('message', async (ctx: Context) => {
  const message = ctx.message;
  const chat = ctx.chat;
  if (!message || !chat) return;

  const from = message.from;
  const chatId = chat.id;
  const isPrivate = chat.type === 'private';
  const senderId = from?.id || 0;
  const username = from?.username || from?.first_name || 'Anonim';

  // 1. Ekstraksi teks & media
  let messageText = message.text || message.caption || '';
  let mediaType: string | null = null;
  let mediaFileId: string | null = null;

  if (message.photo && message.photo.length > 0) {
    mediaType = 'photo';
    // Ambil resolusi terbesar (elemen terakhir pada array photo)
    mediaFileId = message.photo[message.photo.length - 1].file_id;
  } else if (message.video) {
    mediaType = 'video';
    mediaFileId = message.video.file_id;
  } else if (message.document) {
    mediaType = 'document';
    mediaFileId = message.document.file_id;
  } else if (message.voice) {
    mediaType = 'voice';
    mediaFileId = message.voice.file_id;
  } else if (message.sticker) {
    mediaType = 'sticker';
    mediaFileId = message.sticker.file_id;
  }

  // 2. Simpan secara asinkron ke Supabase (tidak memblokir alur kerja)
  saveChatMessage({
    chat_id: chatId,
    user_id: senderId,
    username: username,
    message_text: messageText || (mediaType ? `[Mengirim ${mediaType}]` : null),
    media_type: mediaType,
    media_file_id: mediaFileId,
  }).catch((err) => console.error('Save message async error:', err));

  // 3. Deteksi apakah AI harus merespon (AI Trigger)
  const currentBotUsername = botUsername || (ctx.me?.username ? ctx.me.username.toLowerCase() : '');
  const isReplyToBot = message.reply_to_message?.from?.id === ctx.me?.id;
  const isMentioned = currentBotUsername
    ? messageText.toLowerCase().includes(`@${currentBotUsername}`)
    : false;
  const isAskCommand = messageText.startsWith('/ask') || messageText.startsWith('/ai');

  // Trigger AI jika:
  // - Chat pribadi (DM)
  // - Bot di-reply
  // - Bot di-mention
  // - Command /ask atau /ai
  const shouldRespond = isPrivate || isReplyToBot || isMentioned || isAskCommand;

  if (!shouldRespond) {
    // Jika bukan trigger, biarkan pesan tersimpan di memory saja
    return;
  }

  // 4. Verifikasi Hak Akses: Di grup hanya Admin / Owner yang boleh memanggil AI
  if (!isPrivate) {
    const isAdmin = await isUserAdmin(ctx, chatId, senderId);
    if (!isAdmin) {
      await ctx.reply(
        '⛔ Eits sori bray, di grup ini gue cuma disetel buat dengerin & nurut sama *Admin Grup* doang! 😜',
        {
          reply_to_message_id: message.message_id,
          parse_mode: 'Markdown',
        }
      );
      return;
    }
  }

  // Bersihkan teks dari mention bot / command
  let cleanedPrompt = messageText;
  if (currentBotUsername) {
    cleanedPrompt = cleanedPrompt.replace(new RegExp(`@${currentBotUsername}`, 'gi'), '').trim();
  }
  cleanedPrompt = cleanedPrompt.replace(/^\/(ask|ai)\s*/i, '').trim();

  // Jika pesan kosong tapi mengirim foto/media
  if (!cleanedPrompt && mediaType) {
    cleanedPrompt = `[User mengirimkan sebuah ${mediaType}] Coba komentarin foto/media ini dong bray!`;
  } else if (!cleanedPrompt) {
    cleanedPrompt = 'Halo bot!';
  }

  // 4. Kirim indikator "sedang mengetik"
  try {
    await ctx.replyWithChatAction('typing');
  } catch (err) {
    // Ignore chat action error
  }

  // 5. Panggil Gemini AI dengan memory context dari Supabase
  try {
    const aiAnswer = await generateAIResponse(chatId, cleanedPrompt, username);

    // Balas pesan
    await ctx.reply(aiAnswer, {
      reply_to_message_id: message.message_id,
      parse_mode: 'Markdown',
    }).catch(async () => {
      // Fallback tanpa markdown jika ada karakter spesial markdown yang tidak valid
      await ctx.reply(aiAnswer, {
        reply_to_message_id: message.message_id,
      });
    });

    // Simpan juga respon bot ke database Supabase agar masuk ke konteks memori percakapan
    saveChatMessage({
      chat_id: chatId,
      user_id: ctx.me.id,
      username: currentBotUsername || 'bot',
      message_text: aiAnswer,
      media_type: null,
      media_file_id: null,
    }).catch((err) => console.error('Save bot answer async error:', err));
  } catch (err: any) {
    console.error('❌ Gagal memproses respon AI:', err);
    await ctx.reply('Aduh sori bray, otak gue lagi ngebul. Coba colek lagi nanti ya!');
  }
});
