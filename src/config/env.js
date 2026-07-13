import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
    botToken: process.env.BOT_TOKEN,
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    tronRpc: process.env.VITE_TRON_RPC,
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-prod-012',
    mainAddress: process.env.VITE_MAIN_ADDRESS,
    usdtAddress: process.env.VITE_USDT_ADDRESS,
};
