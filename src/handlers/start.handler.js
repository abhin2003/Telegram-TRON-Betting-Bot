import { Markup } from 'telegraf';

export const handleStart = async (ctx) => {
    try {
        const telegramUser = ctx.from;
        
        const welcomeText = `Welcome to TronFlip, ${telegramUser.first_name}! 🎲\n\n` +
                            `The ultimate decentralized TRON betting experience.\n` +
                            `Click below to launch the Mini App and connect your wallet!`;
        
        // Use a placeholder URL for the Web App for now (can be configured in .env later)
        const webAppUrl = process.env.WEB_APP_URL || 'https://tronflip-demo.vercel.app';

        await ctx.reply(welcomeText, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🎮 Play TronFlip", web_app: { url: webAppUrl } }]
                ]
            }
        });
        
    } catch (error) {
        console.error('Error in start handler:', error);
        await ctx.reply('An error occurred. Please try again later.');
    }
};
