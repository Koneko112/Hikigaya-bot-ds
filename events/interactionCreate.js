module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Обрабатываем только кнопки (не команды)
        if (!interaction.isButton()) return;

        // ===== ВЕРИФИКАЦИЯ =====
        if (interaction.customId.startsWith('verify_')) {
            // Проверяем, что кнопку нажал саппорт
            const supportRole = interaction.guild.roles.cache.get('1490730905050808530');
            if (!interaction.member.roles.cache.has(supportRole?.id)) {
                return interaction.reply({
                    content: '❌ Только саппорт может верифицировать пользователей!',
                    ephemeral: true
                });
            }

            const parts = interaction.customId.split('_');
            const userId = parts[1];
            const action = parts[2];

            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
                return interaction.reply({
                    content: '❌ Пользователь не найден на сервере',
                    ephemeral: true
                });
            }

            // Убираем временную роль
            const tempRole = interaction.guild.roles.cache.find(r => r.name === 'Неверифицированный');
            if (tempRole) await member.roles.remove(tempRole);

            let roleIds = [];
            let roleNames = [];
            let message = '';

            if (action === 'friend') {
                roleIds = ['1208677626961727530'];
                roleNames = ['Друг стримера'];
                message = `${member} получил роль **Друг стримера**! 🎉`;
            } else if (action === 'subscriber') {
                roleIds = ['1516384875173904434', '1516768526113964212'];
                roleNames = ['Подписчик 1', 'Подписчик 2'];
                message = `${member} получил роли **Подписчик 1** и **Подписчик 2**! 📺`;
            } else if (action === 'kick') {
                await member.kick('Отказ в верификации');
                await interaction.update({
                    content: `❌ Пользователь ${member.user.tag} был исключён`,
                    components: [],
                    embeds: []
                });
                return;
            }

            // Выдаём роли
            for (const roleId of roleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) await member.roles.add(role);
            }

            await interaction.update({
                content: `✅ ${message}`,
                components: [],
                embeds: []
            });

            try {
                await member.send(`✅ Ты получил роль(и): **${roleNames.join(', ')}**! Добро пожаловать! 🎉`);
            } catch (error) {
                console.log(`Не удалось отправить сообщение ${member.user.tag}`);
            }
        }

        // ===== ДРУГИЕ КНОПКИ (если есть) =====
        // Если у тебя есть другие кнопки (тикеты, панель комнат и т.д.),
        // добавь их обработку здесь
    }
};
