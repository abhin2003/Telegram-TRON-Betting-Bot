import axios from 'axios';
import { config } from '../config/env.js';
import { TronWeb } from 'tronweb';

// Admin wallet for payouts
const adminTronWeb = new TronWeb({
    fullHost: config.tronRpc || 'https://api.shasta.trongrid.io',
    privateKey: process.env.VITE_MAIN_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000001'
});

function judge(blockNumber) {
    const lastDigit = blockNumber % 10;
    return {
        lastDigit,
        result: lastDigit % 2 === 0 ? "EVEN" : "ODD"
    };
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
            await telegramBot.sendMessage(telegramId, `❌ **Transaction Not Found**\n\nWe couldn't confirm your transaction on the blockchain. If your TRX was deducted, please contact support.`, { parse_mode: 'Markdown' });
            return;
        }

        // Verify the transaction was successful on chain
        if (txInfo.receipt && txInfo.receipt.result !== 'SUCCESS' && txInfo.receipt.result) {
            await telegramBot.sendMessage(telegramId, `❌ **Transaction Failed**\n\nYour transaction failed on the blockchain.`, { parse_mode: 'Markdown' });
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
                await telegramBot.sendMessage(telegramId, `⚠️ **Payout Delayed**\n\nYou won, but our automatic payout failed. An admin will process it manually.`, { parse_mode: 'Markdown' });
            }
        }

        const message = isWin 
            ? `🎉 **You WON!**\n\nYour bet of **${amountTrx} TRX** on **${normalizedPrediction}** was successful!\n\nBlock Number: \`${blockNumber}\`\nBlock Result: **${result}**\n\nPayout of **${payoutTrx.toFixed(2)} TRX** has been sent to your wallet!${payoutTxid ? `\n[View Payout](https://shasta.tronscan.org/#/transaction/${payoutTxid})` : ''}` 
            : `😢 **You LOST!**\n\nYour bet of **${amountTrx} TRX** on **${normalizedPrediction}** didn't match.\n\nBlock Number: \`${blockNumber}\`\nBlock Result: **${result}**\n\nBetter luck next time!`;
            
        await telegramBot.sendMessage(telegramId, message, { parse_mode: 'Markdown', disable_web_page_preview: true });

    } catch (error) {
        console.error("Error in evaluateBet:", error);
        await telegramBot.sendMessage(telegramId, `❌ **Error Processing Bet**\n\nAn unexpected error occurred while processing your bet. Please contact support.`, { parse_mode: 'Markdown' });
    }
}
