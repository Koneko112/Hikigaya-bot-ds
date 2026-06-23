const economyManager = require('../config/economyManager');

module.exports = {
    name: 'dell',
    description: 'Забрать монеты у пользователя',
    execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ У тебя нет прав администратора');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя: !dell @user 100');
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Укажи положительное число');
        }

        economyManager.addBalance(user.id, -amount);
        message.reply(`✅ Забрано **${amount}** монет у пользователя ${user.tag}`);
    }
};