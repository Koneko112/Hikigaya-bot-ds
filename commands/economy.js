const economyManager = require('../config/economyManager');

module.exports = {
    name: 'баланс',
    description: 'Показать баланс',
    execute(message, args) {
        const userId = message.author.id;
        const balance = economyManager.getUserBalance(userId);
        message.reply(`💰 Твой баланс: **${balance}** монет`);
    }
};