const economyManager = require('../config/economyManager');
const warningsManager = require('../config/warningsManager');

module.exports = {
    name: 'give',
    description: 'Выдать монеты пользователю',
    execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ У тебя нет прав администратора');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя: !give @user 100');
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Укажи положительное число');
        }

        economyManager.addBalance(user.id, amount);
        message.reply(`✅ Выдано **${amount}** монет пользователю ${user.tag}`);
    }
};