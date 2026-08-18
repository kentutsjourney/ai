import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getRecentChatHistory, ChatMessageRecord } from './supabase.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY belum disetel di environment variables!');
}

const genAI = new GoogleGenerativeAI(apiKey);

// System prompt tongkrongan yang singkat, padat, dan tidak bertele-tele
const SYSTEM_INSTRUCTION = `Kamu adalah bot asisten tongkrongan yang asyik, sarkas, dan santai ala anak Jakarta (pake lu/gue).

ATURAN WAJIB:
1. Jawab dengan SINGKAT dan RINGKAS (Maksimal 1 sampai 3 kalimat saja).
2. Jangan bikin paragraf panjang, jangan bertele-tele, jangan ceramah, dan jangan sok formal.
3. Langsung to the point dengan gaya nyeleneh/sarkas santuy.
4. Pahami konteks obrolan sebelumnya.`;

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
      const text = item.message_text ? item.message_text : '(media)';
      return `${name}: ${text}`;
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

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200, // Dibatasi agar respon cepat & tidak kepanjangan
      },
    });

    const userMessagePayload = `[Konteks obrolan sebelumnya]:\n${contextHistory}\n\n[Pesan masuk dari @${senderUsername}]:\n"${currentPrompt}"\n\nJawab dengan singkat (1-3 kalimat saja):`;

    const result = await model.generateContent(userMessagePayload);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return 'Ngeblank pala gue bray, tanya lagi ntar dah.';
    }

    return text.trim();
  } catch (error: any) {
    console.error('❌ Error saat memanggil Gemini API:', error);
    return 'Lagi pusing pala gue bray, colek ntar lagi ya!';
  }
}
