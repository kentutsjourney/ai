import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getRecentChatHistory, ChatMessageRecord } from './supabase.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY belum disetel di environment variables!');
}

const genAI = new GoogleGenerativeAI(apiKey);

// System prompt sesuai permintaan user
const SYSTEM_INSTRUCTION = `Kamu adalah bot asisten grup tongkrongan yang asyik, sarkas tapi helpful. Jawab dengan bahasa Indonesia santai ala anak Jakarta (pake lu/gue, santuy, jangan kaku kayak bot CS). Kamu bisa memahami konteks obrolan dari pesan-pesan sebelumnya. Jika ada yang nanya serius tetap beri solusi yang bener tapi dengan gaya tongkrongan. Jangan terlalu panjang bertele-tele kecuali diminta menjelaskan detail.`;

/**
 * Format riwayat pesan dari database Supabase menjadi string konteks yang rapi untuk Gemini.
 */
function formatHistoryContext(history: ChatMessageRecord[]): string {
  if (!history || history.length === 0) {
    return 'Tidak ada riwayat obrolan sebelumnya.';
  }

  return history
    .map((item) => {
      const name = item.username ? `@${item.username}` : `User_${item.user_id}`;
      const mediaInfo = item.media_type ? ` [Mengirim ${item.media_type}]` : '';
      const text = item.message_text ? item.message_text : '(tanpa caption/teks)';
      return `${name}${mediaInfo}: ${text}`;
    })
    .join('\n');
}

/**
 * Menghasilkan respon AI menggunakan Google Gemini dengan konteks 5 pesan terakhir dari grup/chat.
 */
export async function generateAIResponse(
  chatId: number,
  currentPrompt: string,
  senderUsername: string = 'User'
): Promise<string> {
  try {
    // Ambil 5 pesan terakhir dari Supabase
    const recentMessages = await getRecentChatHistory(chatId, 5);
    const contextHistory = formatHistoryContext(recentMessages);

    // Gunakan model Gemini 2.0 Flash / Gemini 1.5 Flash yang sangat cepat untuk Telegram Bot
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800,
      },
    });

    const userMessagePayload = `[KONTEKS 5 PESAN TERAKHIR DI GRUP]:\n${contextHistory}\n\n[PESAN TERBARU DARI @${senderUsername}]:\n"${currentPrompt}"\n\nBalas pesan terbaru ini sekarang:`;

    const result = await model.generateContent(userMessagePayload);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return 'Duh, pala gue lagi nge-blank nih, coba tanya lagi bentar lagi.';
    }

    return text.trim();
  } catch (error: any) {
    console.error('❌ Error saat memanggil Gemini API:', error);
    return 'Waduh lagi error nih koneksi ke otak gue, coba colek lagi nanti ya bray!';
  }
}
