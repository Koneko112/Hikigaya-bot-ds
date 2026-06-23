const economyManager = require('../config/economyManager');

module.exports = {
    name: 'guildMemberAdd',
    execute(member) {
        // Тут будет логика проверки реферального кода
        // Мы сделаем её позже, через сессию и веб-интерфейс
        console.log(`👤 Новый участник: ${member.user.tag}`);
    }
};
