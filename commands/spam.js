module.exports = {
    name: 'спам',
    description: '📨 Отправить 5 сообщений пользователю в ЛС (пранк)',
    async execute(message, args) {
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('❌ Упомяни пользователя');
        }

        const spamMessages = [
            'Привет! Ты получил сообщение от бота-пранкера! 😂',
            'Это второе сообщение. Надеюсь, тебе смешно!',
            'Третье! Ты всё ещё читаешь?',
            'Четвёртое! Скоро закончим.',
            'Последнее! Удачи на сервере! 🎉'
        ];

        for (const msg of spamMessages) {
            await user.send(msg);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        message.reply(`✅ Сообщения отправлены ${user.username} в ЛС!`);
    }
};
