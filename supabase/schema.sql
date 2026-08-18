-- ==========================================================
-- SUPABASE SCHEMA: chat_history
-- Jalankan query ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.chat_history (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    username TEXT,
    message_text TEXT,
    media_type TEXT,
    media_file_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk mempercepat query 5 pesan terakhir per chat_id
CREATE INDEX IF NOT EXISTS idx_chat_history_chat_id_created_at 
ON public.chat_history (chat_id, created_at DESC);

-- Index untuk mempercepat pencarian media berdasarkan file_id / chat_id
CREATE INDEX IF NOT EXISTS idx_chat_history_media 
ON public.chat_history (chat_id, media_file_id) 
WHERE media_file_id IS NOT NULL;

-- Matikan Row Level Security (RLS) atau buat policy allow all untuk service role
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Policy untuk mengizinkan service_role & anon membaca dan menulis
CREATE POLICY "Allow public access for bot service" 
ON public.chat_history 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);
