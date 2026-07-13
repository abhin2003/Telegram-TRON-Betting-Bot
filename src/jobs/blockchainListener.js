import axios from 'axios';
import { config } from '../config/env.js';
import { TronWeb } from 'tronweb';
import cron from 'node-cron';

// Admin wallet for payouts
const adminTronWeb = new TronWeb({
    fullHost: config.tronRpc || 'https://api.shasta.trongrid.io',
    privateKey: process.env.VITE_MAIN_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001'
});

const processedTxids = new Set();
let botInstance = null;
let isProcessing = false;

function judge(blockNumber) {
    const lastDigit = blockNumber % 10;
    return {
        lastDigit,
        result: lastDigit % 2 === 0 ? "EVEN" : "ODD"
    };
}

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
            if (processedTxids.has(txid)) continue;
            
            // Only process TRX transfers
            if (!tx.raw_data || !tx.raw_data.contract || tx.raw_data.contract[0].type !== "TransferContract") continue;

            const contract = tx.raw_data.contract[0].parameter.value;
            
            // Check memo for ODD|tg_id or EVEN|tg_id
            if (!tx.raw_data.data) continue;
            
            const memoText = Buffer.from(tx.raw_data.data, 'hex').toString('utf8').trim();
            const parts = memoText.split('|');
            
            if (parts.length !== 2) {
                processedTxids.add(txid);
                continue;
            }

            const prediction = parts[0].toUpperCase();
            const telegramId = parts[1];
            
            if (prediction !== 'ODD' && prediction !== 'EVEN') {
                processedTxids.add(txid);
                continue;
            }

            processedTxids.add(txid); // Mark as processed so we don't duplicate
            
            // Delay for 2 seconds to simulate the "Verifying..." phase gracefully
            // so the user actually sees it, then we send the final evaluation.
            if (botInstance) {
                try {
                    await botInstance.telegram.sendMessage(telegramId, `⏳ **Verifying Transaction...**\n\nTXID: \`${txid}\`\n\nPlease wait for block confirmation...`, { parse_mode: 'Markdown' });
                } catch(e) {
                    console.error("Failed to send verification message:", e.message);
                }
            }

            const amountSun = contract.amount;
            const amountTrx = amountSun / 1_000_000;
            const playerAddressHex = contract.owner_address;
            const playerAddress = adminTronWeb.address.fromHex(playerAddressHex);
            
            // Small delay to ensure the user reads the "Verifying..." message
            setTimeout(() => {
                evaluateBet(txid, playerAddress, amountTrx, prediction, telegramId, botInstance ? botInstance.telegram : null);
            }, 3000);
        }
    } catch (error) {
        console.error("Error processing blockchain listener:", error.message);
    } finally {
        isProcessing = false;
    }
}

export function startBlockchainListener(bot) {
    botInstance = bot;
    cron.schedule('*/5 * * * * *', checkNewBets);
    console.log("Global Blockchain Listener started for automatic memo-based processing.");
}

export async function evaluateBet(txid, playerAddress, amountTrx, prediction, telegramId, telegramBot) {
    try {
        let attempts = 0;
        let tx = null;
        let txInfo = null;
        
        // Poll for transaction confirmation
        while (attempts < 15) {
            try {
                tx = await adminTronWeb.trx.getTransaction(txid);
                txInfo = await adminTronWeb.trx.getTransactionInfo(txid);
                if (tx && txInfo && Object.keys(txInfo).length > 0) {
                    break;
                }
            } catch (e) {
                // Ignore errors while polling
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempts++;
        }

        if (!tx || !txInfo || Object.keys(txInfo).length === 0) {
            if (telegramBot) await telegramBot.sendMessage(telegramId, `❌ **Transaction Not Found**\n\nWe couldn't confirm your transaction on the blockchain. If your TRX was deducted, please contact support.`, { parse_mode: 'Markdown' });
            return;
        }

        // Verify the transaction was successful on chain
        if (txInfo.receipt && txInfo.receipt.result !== 'SUCCESS' && txInfo.receipt.result) {
            if (telegramBot) await telegramBot.sendMessage(telegramId, `❌ **Transaction Failed**\n\nYour transaction failed on the blockchain.`, { parse_mode: 'Markdown' });
            return;
        }

        const blockNumber = txInfo.blockNumber;
        const { result } = judge(blockNumber);
        
        // Normalize prediction
        const normalizedPrediction = prediction.toUpperCase();
        const isWin = normalizedPrediction === result;
        
        let payoutTrx = 0;
        let payoutTxid = null;

        if (isWin) {
            payoutTrx = amountTrx * 1.8; // PAYOUT_MULTIPLIER
            const payoutSun = Math.floor(payoutTrx * 1_000_000);
            
            try {
                const payoutTx = await adminTronWeb.transactionBuilder.sendTrx(playerAddress, payoutSun, config.mainAddress);
                const signed = await adminTronWeb.trx.sign(payoutTx);
                const broadcast = await adminTronWeb.trx.sendRawTransaction(signed);
                if (broadcast.result) {
                    payoutTxid = broadcast.transaction.txID;
                    console.log(`[Payout Success] ${payoutTrx} TRX sent to ${playerAddress}`);
                }
            } catch (e) {
                console.error("[Payout Error] Failed to send TRX:", e.message);
                if (telegramBot) await telegramBot.sendMessage(telegramId, `⚠️ **Payout Delayed**\n\nYou won, but our automatic payout failed. An admin will process it manually.`, { parse_mode: 'Markdown' });
            }
        }

        const message = isWin 
            ? `🎉 **You WON!**\n\nYour bet of **${amountTrx} TRX** on **${normalizedPrediction}** was successful!\n\nBlock Number: \`${blockNumber}\`\nBlock Result: **${result}**\n\nPayout of **${payoutTrx.toFixed(2)} TRX** has been sent to your wallet!${payoutTxid ? `\n[View Payout](https://shasta.tronscan.org/#/transaction/${payoutTxid})` : ''}` 
            : `😢 **You LOST!**\n\nYour bet of **${amountTrx} TRX** on **${normalizedPrediction}** didn't match.\n\nBlock Number: \`${blockNumber}\`\nBlock Result: **${result}**\n\nBetter luck next time!`;
            
        if (telegramBot) await telegramBot.sendMessage(telegramId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });

    } catch (error) {
        console.error("Error in evaluateBet:", error);
        if (telegramBot) await telegramBot.sendMessage(telegramId, `❌ **Error Processing Bet**\n\nAn unexpected error occurred while processing your bet. Please contact support.`, { parse_mode: 'Markdown' });
    }
}
