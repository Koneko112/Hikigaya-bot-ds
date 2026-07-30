const configManager = require('../config/configManager');
const economyManager = require('../config/economyManager');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const referralsFile = path.join(__dirname, '..', 'data', 'referrals.json');

function loadReferrals() {
    if (!fs.existsSync(referralsFile)) {
        fs.writeFileSync(referralsFile, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(referralsFile, 'utf8'));
}

function saveReferrals(data) {
    fs.writeFileSync(referralsFile, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const config = configManager.getConfig();
        
        // ===== ПРИВЕТСТВЕННОЕ СООБЩЕНИЕ =====
        if (config.welcomeMessage) {
            const channel = member.guild.systemChannel;
            if (channel) {
                const message = config.welcomeMessage.replace('{user}', `<@${member.id}>`);
                channel.send(message);
            }
        }
        
        // ===== АВТОРОЛЬ — УБРАНО! =====
        // Теперь вместо автороли выдаётся временная роль "Неверифицированный"
        
        // ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
        try {
            const userId = member.id;
            const referrals = loadReferrals();
            
            let referrerId = null;
            let inviteData = null;
            
            for (const [id, data] of Object.entries(referrals)) {
                if (data.invited) {
                    const found = data.invited.find(i => i.id === userId);
                    if (found) {
                        referrerId = id;
                        inviteData = found;
                        break;
                    }
                }
            }
            
            if (referrerId && inviteData && !inviteData.joined) {
                inviteData.joined = true;
                inviteData.joinedAt = new Date().toISOString();
                
                const bonusAmount = 500;
                economyManager.addBalance(referrerId, bonusAmount);
                
                const referrerData = referrals[referrerId];
                referrerData.bonus = (referrerData.bonus || 0) + bonusAmount;
                
                saveReferrals(referrals);
                
                console.log(`✅ Реферал: ${member.user.tag} пришёл по приглашению от ${referrerId}`);
                
                try {
                    const referrer = await member.guild.members.fetch(referrerId);
                    if (referrer) {
                        referrer.send(`🎉 Поздравляем! ${member.user.tag} присоединился по вашему приглашению! Вы получили ${bonusAmount} монет!`).catch(() => {});
                    }
                } catch (e) {}
            }
        } catch (error) {
            console.error('Ошибка в реферальной системе:', error);
        }

        // ===== ВЕРИФИКАЦИЯ =====
        try {
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
            if (!channel) {
                console.log('Канал для верификации не найден');
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0xfdcb6e)
                .setTitle('🆕 Новый участник')
                .setDescription(`**Пользователь:** ${member} (${member.user.tag})\n**ID:** ${member.id}\n**Аккаунт создан:** ${member.user.createdAt.toLocaleDateString('ru-RU')}`)
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
                content: `<@&1490730905050808530>`,
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Ошибка в верификации:', error);
        }
    }
};
