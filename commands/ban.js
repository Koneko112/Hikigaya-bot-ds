module.exports = {
    name: 'ban',
    description: 'Забанить пользователя',
    execute(message, args) {
        if (!message.member.permissions.has('BanMembers')) {
            return message.reply('❌ У тебя нет прав банить');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя: !ban @user причина');
        }

        const member = message.guild.members.resolve(user);
        if (!member) {
            return message.reply('❌ Пользователь не на сервере');
        }

        const reason = args.slice(1).join(' ') || 'Причина не указана';

        member.ban({ reason })
            .then(() => {
                message.reply(`✅ Пользователь **${user.tag}** забанен
Причина: ${reason}`);
            })
            .catch(err => {
                console.error(err);
                message.reply('❌ Не удалось забанить (возможно, роль выше)');
            });
    }
};