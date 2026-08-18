# 🤖 Telegram Bot AI (Tongkrongan Asisten)

Codebase Telegram Bot AI pintar, sarkas, dan asyik berbasis TypeScript. Didesain secara khusus untuk arsitektur serverless **Vercel**, dengan **grammY framework**, **Google Gemini API**, dan **Supabase** sebagai dynamic memory database.

---

## 📑 Fitur Utama

- ⚡ **Serverless Ready**: Menggunakan grammY `webhookCallback` yang dioptimasi untuk Vercel Serverless Functions.
- 🧠 **Dynamic Memory (Context-Aware)**: Menyimpan setiap pesan masuk di grup ke Supabase (`chat_history`) dan mengirim 5 pesan terakhir ke Google Gemini sebagai konteks obrolan.
- 🎯 **Smart Trigger**:
  - Otomatis merespons di Private Chat (DM).
  - Merespons jika di-reply oleh member grup.
  - Merespons jika di-mention `@bot_username`.
  - Merespons command `/ask <pertanyaan>`.
- 🖼️ **Media Handling**:
  - Menyimpan metadata dan `file_id` foto/video/dokumen/suara ke Supabase.
  - Fitur recall media via command `/getmedia` untuk memanggil kembali foto/media terakhir.
- 😎 **Tongkrongan Persona**: Menggunakan System Prompt ala anak tongkrongan Jakarta yang sarkas tapi tetap solutif dan asyik.

---

## 📁 Struktur Direktori

```text
.
├── api/
│   └── webhook.ts          # Entry point serverless Vercel (Telegram Webhook)
├── src/
│   ├── bot.ts              # Inisialisasi grammY bot, command routing, message interceptor
│   ├── ai.ts               # Integrasi Google Gemini API & format memory context
│   ├── supabase.ts         # Inisialisasi Supabase client & database query helpers
│   └── dev.ts              # Script running polling untuk development lokal
├── scripts/
│   └── set-webhook.ts      # Script otomatis untuk register webhook ke Telegram API
├── supabase/
│   └── schema.sql          # DDL Schema tabel chat_history & indexing
├── package.json
├── tsconfig.json
├── vercel.json             # Konfigurasi routing serverless Vercel
├── .env.example
└── README.md
```

---

## 🛠️ Langkah-Langkah Setup

### 1. Clone & Install Dependencies

Jalankan di terminal (Bash):
```bash
npm install
```

---

### 2. Setup Database Supabase

1. Buka dashboard [Supabase](https://supabase.com) dan buat project baru.
2. Masuk ke menu **SQL Editor** di sidebar kiri.
3. Buka file `supabase/schema.sql` pada repository ini, copy seluruh kodenya dan paste di SQL Editor Supabase, lalu klik **Run**:

```sql
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

CREATE INDEX IF NOT EXISTS idx_chat_history_chat_id_created_at 
ON public.chat_history (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_history_media 
ON public.chat_history (chat_id, media_file_id) 
WHERE media_file_id IS NOT NULL;

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access for bot service" 
ON public.chat_history 
FOR ALL 
TO anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);
```

4. Buka **Project Settings** -> **API** untuk mendapatkan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (atau anon key).

---

### 3. Setup Bot Telegram & Gemini API

1. **Telegram Bot Token**:
   - Buka Telegram, cari `@BotFather`.
   - Ketik `/newbot`, ikuti petunjuk dan salin **Bot Token** yang diberikan.
   - Matikan Privacy Mode di BotFather jika ingin bot bisa membaca semua pesan grup untuk memori:
     - Ketik `/setprivacy` -> Pilih bot kamu -> Pilih **Disable**.
2. **Google Gemini API Key**:
   - Kunjungi [Google AI Studio](https://aistudio.google.com/).
   - Buat dan salin **API Key**.

---

### 4. Konfigurasi Environment Variables

Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Isi variabel di `.env`:
```env
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
BOT_USERNAME="NamaBotLu"
GEMINI_API_KEY="AIzaSyXXXXXXXXXXXXXXXX"
SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJh...kunci_service_role..."
VERCEL_URL="https://your-bot-name.vercel.app"
SECRET_TOKEN="kunci_rahasia_bebas_acak"
```

---

### 5. Deploy ke Vercel

#### Opsi A: Deploy via GitHub (Paling Direkomendasikan)
1. Push codebase ini ke repository GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com) -> **Add New Project** -> Import repository GitHub Anda.
3. Masukkan semua Environment Variables dari file `.env` ke kolom **Environment Variables** di Vercel:
   - `TELEGRAM_BOT_TOKEN`
   - `BOT_USERNAME`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SECRET_TOKEN`
   - `VERCEL_URL` (Domain yang diberikan oleh Vercel setelah project dibuat, misal: `https://my-ai-bot.vercel.app`)
4. Klik **Deploy**.

#### Opsi B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

### 6. Setting Webhook URL ke Telegram

Setelah aplikasi berhasil ter-deploy di Vercel dan Anda mendapatkan domain publiknya (misal: `https://my-bot.vercel.app`), Anda memiliki 2 cara untuk mengaktifkan webhook:

#### Cara 1: Menggunakan Script Otomatis
Pastikan `VERCEL_URL` dan `TELEGRAM_BOT_TOKEN` di `.env` sudah sesuai dengan domain Vercel, lalu jalankan:
```bash
npm run set-webhook
```

#### Cara 2: Manual via Browser / Curl
Ketik URL berikut di browser Anda:
```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<VERCEL_DOMAIN>/api/webhook&secret_token=<SECRET_TOKEN>&drop_pending_updates=true
```

Jika sukses, Telegram akan membalas:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## 🕹️ Cara Penggunaan Bot di Telegram

1. **Chat Pribadi**: Langsung ketik pertanyaan apa saja ke bot.
2. **Grup Tongkrongan**:
   - Masukkan bot ke dalam grup.
   - Mention bot: `@NamaBot menurut lu si Budi kemaren kenapa cabut duluan?`
   - Reply pesan bot: Bot akan langsung merespons dengan membaca konteks 5 pesan terakhir di grup tersebut.
   - Command: `/getmedia` untuk memanggil foto/media terakhir yang di-share di grup.
