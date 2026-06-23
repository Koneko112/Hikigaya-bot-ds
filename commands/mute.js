module.exports = {
    name: 'mute',
    description: 'Замутить пользователя на время',
    execute(message, args) {
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply('❌ У тебя нет прав мутить');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя: !mute @user 10m причина');
        }

        const member = message.guild.members.resolve(user);
        if (!member) {
            return message.reply('❌ Пользователь не на сервере');
        }

        const timeArg = args[1];
        if (!timeArg) {
            return message.reply('❌ Укажи время: !mute @user 10m / 1h / 1d');
        }

        const timeMs = parseDuration(timeArg);
        if (!timeMs) {
            return message.reply('❌ Неверный формат времени. Пример: 10m, 1h, 1d');
        }

        const reason = args.slice(2).join(' ') || 'Причина не указана';

        member.timeout(timeMs, reason)
            .then(() => {
                const durationStr = timeArg;
                message.reply(`✅ Пользователь **${user.tag}** замучен на **${durationStr}**
Причина: ${reason}`);
            })
            .catch(err => {
                console.error(err);
                message.reply('❌ Не удалось замутить (возможно, роль выше)');
            });
    }
};

function parseDuration(str) {
    const match = str.match(/^(\d+)(m|h|d)$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    return null;
}