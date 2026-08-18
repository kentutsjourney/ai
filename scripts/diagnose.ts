import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const geminiKey = process.env.GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function diagnose() {
  console.log('=== DIAGNOSTIK BOT TELEGRAM ===\n');

  // 1. Cek Webhook Info Telegram
  console.log('1. Memeriksa Webhook Telegram...');
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await res.json();
    console.log('Status Webhook:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error cek webhook:', err.message);
  }

  // 2. Cek Gemini API
  console.log('\n2. Memeriksa Google Gemini API...');
  try {
    const genAI = new GoogleGenerativeAI(geminiKey || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Halo');
    console.log('✅ Gemini API Response:', result.response.text());
  } catch (err: any) {
    console.error('❌ Gemini API GAGAL:', err.message);
  }

  // 3. Cek Supabase
  console.log('\n3. Memeriksa Supabase Connection...');
  try {
    const supabase = createClient(supabaseUrl || '', supabaseKey || '');
    const { data, error } = await supabase.from('chat_history').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase error:', error.message);
    } else {
      console.log('✅ Supabase OK. Data sample:', data);
    }
  } catch (err: any) {
    console.error('❌ Supabase exception:', err.message);
  }
}

diagnose();
