import axios from 'axios';
import { supabase } from '../database/supabase.js';
import { config } from '../config/env.js';
import { Telegraf } from 'telegraf';
import { TronWeb } from 'tronweb';
import cron from 'node-cron';

// Safely initialize bot for notifications
let bot;
if (config.botToken && config.botToken !== 'dummy_telegram_bot_token_for_dev') {
    bot = new Telegraf(config.botToken);
}

// Admin wallet for payouts
const adminTronWeb = new TronWeb({
    fullHost: config.tronRpc || 'https://api.shasta.trongrid.io',
    privateKey: process.env.VITE_MAIN_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001' // fallback
});

function judge(blockNumber) {
    const lastDigit = blockNumber % 10;
    return {
        lastDigit,
        result: lastDigit % 2 === 0 ? "EVEN" : "ODD"
    };
}

let isProcessing = false;

export async function checkNewBets() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        if (!config.mainAddress) {
            console.warn('VITE_MAIN_ADDRESS is missing. Cannot listen for bets.');
            return;
        }

        const url = `${config.tronRpc}/v1/accounts/${config.mainAddress}/transactions?only_to=true&limit=20`;
        const response = await axios.get(url);
        
        if (!response.data || !response.data.data) return;

        for (const tx of response.data.data) {
            const txid = tx.txID;
            
            // Check if processed
            const { data: existingBet } = await supabase.from('bets').select('id').eq('id', txid).single();
            if (existingBet) continue;

            // Only process TRX transfers
            if (!tx.raw_data || !tx.raw_data.contract || tx.raw_data.contract[0].type !== "TransferContract") continue;

            const contract = tx.raw_data.contract[0].parameter.value;
            
            // Check memo for ODD or EVEN
            if (!tx.raw_data.data) continue;
            
            const memoText = Buffer.from(tx.raw_data.data, 'hex').toString('utf8').trim().toUpperCase();
            if (memoText !== 'ODD' && memoText !== 'EVEN') continue;

            // Validate amounts
            const amountSun = contract.amount;
            const amountTrx = amountSun / 1_000_000;
            if (amountTrx < 10) continue; // MIN_BET_TRX

            const playerAddressHex = contract.owner_address;
            const playerAddress = adminTronWeb.address.fromHex(playerAddressHex);
            
            const blockNumber = tx.blockNumber;
            const { result } = judge(blockNumber);
            const isWin = memoText === result;
            
            let payoutTrx = 0;
            if (isWin) {
                payoutTrx = amountTrx * 1.8; // PAYOUT_MULTIPLIER
                const payoutSun = Math.floor(payoutTrx * 1_000_000);
                
                try {
                    const payoutTx = await adminTronWeb.transactionBuilder.sendTrx(playerAddress, payoutSun, config.mainAddress);
                    const signed = await adminTronWeb.trx.sign(payoutTx);
                    await adminTronWeb.trx.sendRawTransaction(signed);
                    console.log(`[Payout Success] ${payoutTrx} TRX sent to ${playerAddress}`);
                } catch (e) {
                    console.error("[Payout Error] Failed to send TRX:", e.message);
                }
            }

            // Save to Supabase
            await supabase.from('bets').insert({
                id: txid,
                player: playerAddress,
                prediction: memoText,
                amount: amountTrx,
                asset: 'TRX',
                block: blockNumber,
                result: result,
                payout: payoutTrx
            });
            
            // Send Telegram Notification
            if (bot) {
                const { data: user } = await supabase.from('users').select('telegram_id').eq('tron_address', playerAddress).single();
                if (user && user.telegram_id) {
                    const message = isWin 
                        ? `🎉 *You WON!*\nYour bet of ${amountTrx} TRX on ${memoText} was successful.\nPayout: ${payoutTrx} TRX has been sent to your wallet!` 
                        : `😢 *You LOST!*\nYour bet of ${amountTrx} TRX on ${memoText} didn't match the block hash. Better luck next time!`;
                    try {
                        await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
                    } catch (err) {
                        console.error("Failed to notify user:", user.telegram_id);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error processing blockchain listener:", error.message);
    } finally {
        isProcessing = false;
    }
}

// Start polling every 5 seconds
export function startBlockchainListener() {
    cron.schedule('*/5 * * * * *', checkNewBets);
    console.log("Blockchain listener started.");
}
