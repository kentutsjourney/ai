import dotenv from 'dotenv';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const vercelUrl = process.env.VERCEL_URL;
const secretToken = process.env.SECRET_TOKEN;

if (!botToken) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN belum diisi di file .env');
  process.exit(1);
}

if (!vercelUrl) {
  console.error('❌ Error: VERCEL_URL belum diisi di file .env (contoh: https://my-bot.vercel.app)');
  process.exit(1);
}

// Bersihkan URL dari trailing slash
const cleanDomain = vercelUrl.replace(/\/+$/, '');
const webhookUrl = `${cleanDomain}/api/webhook`;

async function setupWebhook() {
  console.log(`🔗 Mengatur Webhook Telegram ke: ${webhookUrl}`);

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;

  const bodyPayload: any = {
    url: webhookUrl,
    allowed_updates: ['message', 'edited_message', 'callback_query'],
    drop_pending_updates: true,
  };

  if (secretToken) {
    bodyPayload.secret_token = secretToken;
  }

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = (await response.json()) as any;

    if (data.ok) {
      console.log('✅ BERHASIL! Webhook Telegram telah berhasil disetel:');
      console.log(data);
    } else {
      console.error('❌ Gagal menyetel webhook:', data.description);
    }
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat request ke Telegram API:', error);
  }
}

setupWebhook();
