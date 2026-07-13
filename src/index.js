import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './config/env.js';
import { handleStart } from './handlers/start.handler.js';
import { startBlockchainListener } from './jobs/blockchainListener.js';
import { supabase } from './database/supabase.js';

// Ensure BOT_TOKEN is present
if (!config.botToken || config.botToken === 'dummy_telegram_bot_token_for_dev') {
    console.warn('WARNING: BOT_TOKEN is missing or dummy. Bot will not start correctly.');
}

// Initialize Telegraf
const bot = new Telegraf(config.botToken || 'DUMMY_TOKEN');

// Register handlers
bot.start(handleStart);

// Basic Express server
const app = express();
app.use(express.json()); // Add JSON middleware for POST requests
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('TronFlip Telegram Bot is running!');
});

// API endpoint for TMA to register user's connected wallet
app.post('/api/connect-wallet', async (req, res) => {
    const { telegramId, tronAddress } = req.body;
    if (!telegramId || !tronAddress) {
        return res.status(400).json({ error: 'Missing telegramId or tronAddress' });
    }

    try {
        // Upsert user to map telegram_id to tron_address
        const { error } = await supabase.from('users').upsert({
            telegram_id: telegramId.toString(),
            tron_address: tronAddress,
            // the rest can be null since it's non-custodial
        }, { onConflict: 'telegram_id' });

        if (error) throw error;
        res.json({ success: true, message: 'Wallet linked to Telegram account' });
    } catch (err) {
        console.error('Wallet connect error:', err.message);
        res.status(500).json({ error: 'Failed to link wallet' });
    }
});

app.listen(PORT, () => {
    console.log(`Health check and API server listening on port ${PORT}`);
});

// Start background blockchain listener
startBlockchainListener();

// Launch bot
if (config.botToken) {
    bot.launch().then(() => {
        console.log('TronFlip Telegram Bot launched successfully');
    }).catch(err => {
        console.error('Failed to launch bot:', err);
    });
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
