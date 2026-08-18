import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum disetel!');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export interface ChatMessageRecord {
  id?: number;
  chat_id: number;
  user_id: number;
  username: string | null;
  message_text: string | null;
  media_type?: string | null;
  media_file_id?: string | null;
  created_at?: string;
}

/**
 * Menyimpan pesan chat ke Supabase secara asinkron.
 * Dilengkapi try-catch agar error database tidak memblokir webhook Telegram.
 */
export async function saveChatMessage(payload: ChatMessageRecord): Promise<void> {
  try {
    const { error } = await supabase.from('chat_history').insert({
      chat_id: payload.chat_id,
      user_id: payload.user_id,
      username: payload.username,
      message_text: payload.message_text,
      media_type: payload.media_type || null,
      media_file_id: payload.media_file_id || null,
    });

    if (error) {
      console.error('❌ Gagal menyimpan pesan ke Supabase:', error.message);
    }
  } catch (err) {
    console.error('❌ Exception saat saveChatMessage:', err);
  }
}

/**
 * Mengambil N pesan terakhir dalam satu chat/grup untuk dijadikan konteks AI.
 * Diurutkan dari yang paling lama ke paling baru (kronologis).
 */
export async function getRecentChatHistory(
  chatId: number,
  limit: number = 5
): Promise<ChatMessageRecord[]> {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('id, chat_id, user_id, username, message_text, media_type, media_file_id, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Gagal mengambil chat history:', error.message);
      return [];
    }

    // Balik urutan agar kronologis (Oldest -> Newest)
    return (data || []).reverse();
  } catch (err) {
    console.error('❌ Exception saat getRecentChatHistory:', err);
    return [];
  }
}

/**
 * Mengambil riwayat media terbaru atau berdasarkan file ID
 */
export async function getLastMediaInChat(
  chatId: number,
  mediaType?: string
): Promise<ChatMessageRecord | null> {
  try {
    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('chat_id', chatId)
      .not('media_file_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (mediaType) {
      query = query.eq('media_type', mediaType);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as ChatMessageRecord;
  } catch (err) {
    console.error('❌ Exception saat getLastMediaInChat:', err);
    return null;
  }
}
