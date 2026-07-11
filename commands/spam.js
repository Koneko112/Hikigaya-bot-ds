module.exports = {
    name: 'спам',
    description: '📨 Отправить сообщение в ЛС пользователю (пранк)',
    async execute(message, args) {
        // Проверяем, что есть упоминание
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя: `!спам @user текст`');
        }

        // Проверяем, что есть текст
        const text = args.slice(1).join(' ');
        if (!text) {
            return message.reply('❌ Напиши текст: `!спам @user Привет! Это спам!`');
        }

        // Проверяем, что пользователь не бот
        if (user.bot) {
            return message.reply('❌ Нельзя спамить ботам!');
        }

        // Предупреждение
        const warnMsg = await message.reply(`⚠️ Отправить "${text}" пользователю ${user.username} 5 раз в ЛС? (да/нет)`);

        const filter = (m) => m.author.id === message.author.id && ['да', 'нет'].includes(m.content.toLowerCase());
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 10000 });

            if (collected.first().content.toLowerCase() === 'нет') {
                return message.reply('❌ Отменено');
            }
        } catch {
            return message.reply('⏰ Время вышло, отмена');
        }

        // Отправляем
        try {
            for (let i = 0; i < 5; i++) {
                await user.send(text);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            message.reply(`✅ Сообщения отправлены ${user.username} в ЛС!`);
        } catch (error) {
            message.reply(`❌ Не удалось отправить сообщение ${user.username} (возможно, у него закрыты ЛС)`);
        }
    }
};
