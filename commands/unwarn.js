const fs = require('fs');
const path = require('path');
const warningsManager = require('../config/warningsManager');

module.exports = {
    name: 'unwarn',
    description: 'Снять предупреждение с пользователя',
    async execute(message, args) {
        // Проверка прав
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply('❌ У вас нет прав на снятие варнов');
        }

        // Проверка аргументов
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяните пользователя: `!unwarn @user`');
        }

        const userId = user.id;
        const guildId = message.guildId;

        // Получаем варны пользователя
        const warns = warningsManager.getUserWarnings(guildId, userId);

        if (!warns || warns.length === 0) {
            return message.reply(`✅ У пользователя ${user.tag} нет варнов`);
        }

        // Удаляем последний варн
        const lastWarn = warns[warns.length - 1];
        warningsManager.clearWarnings(guildId, userId);

        // Возвращаем все варны, кроме последнего
        const remainingWarns = warns.slice(0, -1);
        if (remainingWarns.length > 0) {
            // Если есть оставшиеся варны — сохраняем их
            const data = warningsManager.getAllWarnings();
            if (!data.guilds[guildId]) data.guilds[guildId] = { users: {} };
            data.guilds[guildId].users[userId] = remainingWarns;
            fs.writeFileSync(
                path.join(__dirname, '..', 'data', 'warnings.json'),
                JSON.stringify(data, null, 2)
            );
        }

        message.reply(`✅ Снят последний варн у пользователя ${user.tag}\n📝 Причина: ${lastWarn.reason}\n🔢 Осталось варнов: ${remainingWarns.length}`);
    }
};
