const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'команда',
    description: '👥 Показать структуру команды сервера',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setColor(0x7c5cfc)
            .setTitle('👥 Команда сервера')
            .setDescription('Люди, которые делают этот сервер лучше')
            .addFields(
                {
                    name: '⚜️ Администратор стаффа',
                    value: 'Управление командой, развитие и продвижение.\n⚜️ **Администратор стаффа:** <@629216255873908736>',
                    inline: false
                },
                {
                    name: '👑 Администратор',
                    value: 'Занимаются развитием и продвижением сервера.\n👑 **Администратор сервера:** <@1091889146265604117>',
                    inline: false
                },
                {
                    name: '💻 Разработчик',
                    value: 'Создатели бота, техническая поддержка.',
                    inline: false
                },
                {
                    name: '⚔️ Куратор',
                    value: 'Руководят и развивают свои ветки. Определить зоны ответственности можно по ролям.',
                    inline: false
                },
                {
                    name: '🔨 Модератор',
                    value: 'Следят за порядком на сервере.',
                    inline: false
                },
                {
                    name: '🎨 Дизайнер',
                    value: '❌ Вакансия! Ищем дизайнера.\nЕсли хочешь стать частью команды — напиши <@629216255873908736>',
                    inline: false
                },
                {
                    name: '🍁 Саппорт',
                    value: 'Помощь участникам.\n🍁 **Саппорт:** ❌ Вакансия!',
                    inline: false
                }
            )
            .setFooter({ text: 'Нарушение правил? Обратись к модераторам!' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
