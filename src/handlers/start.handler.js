import { Markup } from 'telegraf';

export const handleStart = async (ctx) => {
    try {
        const welcomeText = `Welcome to TronFlip! 🎲\n\nChoose your prediction to start playing:`;
        
        await ctx.reply(welcomeText, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "ODD", callback_data: "pred_ODD" },
                        { text: "EVEN", callback_data: "pred_EVEN" }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Error in start handler:', error);
    }
};

export const handlePrediction = async (ctx) => {
    try {
        const prediction = ctx.match[1]; // ODD or EVEN
        
        await ctx.editMessageText(`You chose **${prediction}**.\nSelect the amount of TRX to bet:`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "10 TRX", callback_data: `amt_${prediction}_10` },
                        { text: "20 TRX", callback_data: `amt_${prediction}_20` }
                    ],
                    [
                        { text: "50 TRX", callback_data: `amt_${prediction}_50` },
                        { text: "Manual Entry", callback_data: `manual_${prediction}` }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error('Error in prediction handler:', error);
    }
};

export const handleAmount = async (ctx) => {
    try {
        const prediction = ctx.match[1];
        const amount = ctx.match[2];
        
        let webAppUrl;
        try {
            const urlObj = new URL(process.env.WEB_APP_URL || 'https://tronflip-demo.vercel.app');
            urlObj.searchParams.set('prediction', prediction);
            urlObj.searchParams.set('amount', amount);
            urlObj.searchParams.set('tg_id', ctx.from.id);
            urlObj.searchParams.set('cb', Date.now()); // Cache buster
            webAppUrl = urlObj.toString();
        } catch(e) {
            webAppUrl = `https://telegram-tron-betting-bot-5sen.vercel.app/?prediction=${prediction}&amount=${amount}&tg_id=${ctx.from.id}&cb=${Date.now()}`;
        }

        await ctx.editMessageText(`🎲 **Ready to bet!**\n\nPrediction: **${prediction}**\nAmount: **${amount} TRX**\n\nClick the button below to connect TronLink and sign the transaction in your browser.`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 Open in Browser to Sign", url: webAppUrl }]
                ]
            }
        });
    } catch (error) {
        console.error('Error in amount handler:', error);
    }
};

export const pendingManualAmounts = new Map();

export const handleManualAmount = async (ctx) => {
    try {
        const prediction = ctx.match[1];
        pendingManualAmounts.set(ctx.from.id, prediction);
        await ctx.reply(`You chose **${prediction}**.\nPlease type the amount of TRX you want to bet (minimum 10):`, {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
        });
    } catch (error) {
        console.error('Error in manual amount handler:', error);
    }
};

export const handleText = async (ctx) => {
    try {
        const userId = ctx.from.id;
        if (pendingManualAmounts.has(userId)) {
            const prediction = pendingManualAmounts.get(userId);
            const amountStr = ctx.message.text.trim();
            const amount = parseFloat(amountStr);
            
            if (isNaN(amount) || amount < 10) {
                await ctx.reply("Please enter a valid amount of at least 10 TRX:");
                return;
            }
            
            pendingManualAmounts.delete(userId);
            
            let webAppUrl;
            try {
                const urlObj = new URL(process.env.WEB_APP_URL || 'https://tronflip-demo.vercel.app');
                urlObj.searchParams.set('prediction', prediction);
                urlObj.searchParams.set('amount', amount);
                urlObj.searchParams.set('tg_id', userId);
                urlObj.searchParams.set('cb', Date.now()); // Cache buster
                webAppUrl = urlObj.toString();
            } catch(e) {
                webAppUrl = `https://telegram-tron-betting-bot-5sen.vercel.app/?prediction=${prediction}&amount=${amount}&tg_id=${userId}&cb=${Date.now()}`;
            }

            await ctx.reply(`🎲 **Ready to bet!**\n\nPrediction: **${prediction}**\nAmount: **${amount} TRX**\n\nClick the button below to connect TronLink and sign the transaction in your browser.`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🌐 Open in Browser to Sign", url: webAppUrl }]
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Error in text handler:', error);
    }
};
