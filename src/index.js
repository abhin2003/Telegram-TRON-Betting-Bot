import { Telegraf } from 'telegraf';
import express from 'express';
import { config } from './config/env.js';
import { handleStart, handlePrediction, handleAmount, handleManualAmount, handleText } from './handlers/start.handler.js';
import { evaluateBet, startBlockchainListener } from './jobs/blockchainListener.js';
import { supabase } from './database/supabase.js';

// Ensure BOT_TOKEN is present
if (!config.botToken || config.botToken === 'dummy_telegram_bot_token_for_dev') {
    console.warn('WARNING: BOT_TOKEN is missing or dummy. Bot will not start correctly.');
}

// Initialize Telegraf
const bot = new Telegraf(config.botToken || 'DUMMY_TOKEN');

// Register handlers
bot.start(handleStart);
bot.action(/^pred_(ODD|EVEN)$/, handlePrediction);
bot.action(/^amt_(ODD|EVEN)_(\d+)$/, handleAmount);
bot.action(/^manual_(ODD|EVEN)$/, handleManualAmount);
bot.on('text', handleText);

// Basic Express server
const app = express();
app.use(express.json()); // Add JSON middleware for POST requests
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('TronFlip Telegram Bot is running!');
});

// API endpoint for TMA to verify the transaction sent by TronLink
app.post('/api/verify-bet', async (req, res) => {
    const { telegramId, txid, prediction, amount, playerAddress } = req.body;
    
    if (!telegramId || !txid || !prediction || !amount || !playerAddress) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Acknowledge to frontend immediately so it can close
    res.json({ success: true, message: 'Transaction received, verifying on chain...' });

    // Send a message to the user that we are verifying
    try {
        await bot.telegram.sendMessage(telegramId, `⏳ **Verifying Transaction...**\n\nTXID: \`${txid}\`\n\nPlease wait for block confirmation...`, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Failed to send verification message:', err);
    }

    // Process the bet asynchronously
    try {
        // Evaluate the bet manually by calling evaluateBet or a dedicated verifier.
        // For simplicity, we just pass this into our blockchainListener logic.
        await evaluateBet(txid, playerAddress, amount, prediction, telegramId, bot.telegram);
    } catch (err) {
        console.error('Error processing verified bet:', err);
        try {
            await bot.telegram.sendMessage(telegramId, `❌ Error processing bet. If your TRX was sent, please contact support.`);
        } catch (e) {}
    }
});

app.listen(PORT, () => {
    console.log(`Health check and API server listening on port ${PORT}`);
});

// Start background blockchain listener to automatically process transactions via memo
startBlockchainListener(bot);

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
