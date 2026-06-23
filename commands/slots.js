const economyManager = require('../config/economyManager');

module.exports = {
    name: 'slots',
    description: '🎰 Слот-машина',
    async execute(message, args) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 10) {
            return message.reply('❌ Ставка должна быть минимум 10 монет');
        }
        
        const balance = economyManager.getUserBalance(message.author.id);
        if (balance < bet) {
            return message.reply('❌ Недостаточно средств!');
        }
        
        const emojis = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎'];
        const slots = [
            emojis[Math.floor(Math.random() * emojis.length)],
            emojis[Math.floor(Math.random() * emojis.length)],
            emojis[Math.floor(Math.random() * emojis.length)]
        ];
        
        let win = false;
        let multiplier = 0;
        
        if (slots[0] === slots[1] && slots[1] === slots[2]) {
            win = true;
            if (slots[0] === '💎') multiplier = 10;
            else if (slots[0] === '⭐') multiplier = 5;
            else multiplier = 3;
        } else if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
            win = true;
            multiplier = 1.5;
        }
        
        const winnings = Math.floor(bet * multiplier);
        
        if (win) {
            economyManager.addBalance(message.author.id, winnings);
            message.reply(
                `🎰 **${slots.join(' | ')}**\n` +
                `✅ ВЫ ВЫИГРАЛИ **${winnings}** монет!\n` +
                `(ставка: ${bet} x${multiplier})`
            );
        } else {
            economyManager.addBalance(message.author.id, -bet);
            message.reply(
                `🎰 **${slots.join(' | ')}**\n` +
                `❌ ВЫ ПРОИГРАЛИ **${bet}** монет`
            );
        }
    }
};