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
                        { text: "50 TRX", callback_data: `amt_${prediction}_50` }
                    ],
                    [
                        { text: "100 TRX", callback_data: `amt_${prediction}_100` },
                        { text: "500 TRX", callback_data: `amt_${prediction}_500` }
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
        
        const webAppUrlBase = process.env.WEB_APP_URL || 'https://tronflip-demo.vercel.app';
        // Strip trailing slash if present
        const baseUrl = webAppUrlBase.replace(/\/$/, '');
        // We pass prediction and amount in the URL query string
        const webAppUrl = `${baseUrl}/?prediction=${prediction}&amount=${amount}`;

        await ctx.editMessageText(`🎲 **Ready to bet!**\n\nPrediction: **${prediction}**\nAmount: **${amount} TRX**\n\nClick the button below to connect TronLink and sign the transaction.`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✍️ Sign Transaction", web_app: { url: webAppUrl } }]
                ]
            }
        });
    } catch (error) {
        console.error('Error in amount handler:', error);
    }
};
