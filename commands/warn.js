const warningsManager = require('../config/warningsManager');

module.exports = {
    name: 'warn',
    description: 'Выдать предупреждение',
    async execute(message, args) {
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply('❌ У вас нет прав');
        }
        
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяните пользователя: !warn @user причина');
        }
        
        const reason = args.slice(1).join(' ') || 'Причина не указана';
        
        const warnCount = warningsManager.addWarning(
            message.guildId,
            user.id,
            message.author.id,
            reason
        );
        
        message.reply(
            `⚠️ **${user.tag}** получил предупреждение\n` +
            `📝 Причина: ${reason}\n` +
            `🔢 Всего варнов: ${warnCount}/3`
        );
        
        // Автоматический мут при 3 варнах
        if (warnCount >= 3) {
            const member = await message.guild.members.fetch(user.id);
            await member.timeout(3600000, '3 предупреждения');
            message.channel.send(`🔇 ${user.tag} автоматически замучен на 1 час (3 варна)`);
        }
        
        // Логирование
        const logChannel = message.guild.channels.cache.find(ch => ch.name === 'logs');
        if (logChannel) {
            logChannel.send(`⚠️ **Варн** ${user.tag} от ${message.author.tag}: ${reason} (${warnCount}/3)`);
        }
    }
};