cconst { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        // Временная роль
        let tempRole = member.guild.roles.cache.find(r => r.name === 'Неверифицированный');
        if (!tempRole) {
            tempRole = await member.guild.roles.create({
                name: 'Неверифицированный',
                color: '#ff0000',
                permissions: [],
                reason: 'Автоматическая роль для верификации'
            });
        }
        await member.roles.add(tempRole);

        const channel = member.guild.channels.cache.find(c => c.name === '🛡-верификация');
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(0xfdcb6e)
            .setTitle('🆕 Новый участник')
            .setDescription(`**Пользователь:** ${member} (${member.user.tag})\n**ID:** ${member.id}`)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Выберите действие для этого пользователя' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_${member.id}_friend`)
                    .setLabel('🎮 Друг стримера')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`verify_${member.id}_subscriber`)
                    .setLabel('📺 Подписчик')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`verify_${member.id}_kick`)
                    .setLabel('❌ Отказать')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({
            content: `<@&1490730905050808530>`, // Замени на ID роли саппорта
            embeds: [embed],
            components: [row]
        });
    }
};
