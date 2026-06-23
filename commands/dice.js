const economyManager = require('../config/economyManager');

module.exports = {
    name: 'dice',
    description: '🎲 Бросить кубик',
    async execute(message, args) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 5) {
            return message.reply('❌ Ставка должна быть минимум 5 монет');
        }
        
        const balance = economyManager.getUserBalance(message.author.id);
        if (balance < bet) {
            return message.reply('❌ Недостаточно средств!');
        }
        
        const playerRoll = Math.floor(Math.random() * 6) + 1;
        const botRoll = Math.floor(Math.random() * 6) + 1;
        
        let result = '';
        let winnings = 0;
        
        if (playerRoll > botRoll) {
            winnings = bet;
            result = '✅ ВЫ ВЫИГРАЛИ!';
        } else if (playerRoll < botRoll) {
            winnings = -bet;
            result = '❌ ВЫ ПРОИГРАЛИ!';
        } else {
            result = '🤝 НИЧЬЯ! Ставка возвращена';
        }
        
        economyManager.addBalance(message.author.id, winnings);
        
        message.reply(
            `🎲 **ИГРА В КОСТИ**\n` +
            `Ваш бросок: **${playerRoll}**\n` +
            `Бот бросил: **${botRoll}**\n` +
            `${result}\n` +
            (winnings !== 0 ? `💰 ${winnings > 0 ? '+' : ''}${winnings} монет` : '')
        );
    }
};