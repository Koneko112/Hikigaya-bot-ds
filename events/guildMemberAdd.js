const configManager = require('../config/configManager');
const economyManager = require('../config/economyManager');
const fs = require('fs');
const path = require('path');

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
        
        // ===== АВТОРОЛЬ =====
        if (config.autoRoleId) {
            const role = member.guild.roles.cache.get(config.autoRoleId);
            if (role) {
                member.roles.add(role).catch(console.error);
            }
        }
        
        // ===== РЕФЕРАЛЬНАЯ СИСТЕМА =====
        try {
            const userId = member.id;
            const referrals = loadReferrals();
            
            // Ищем, есть ли приглашение для этого пользователя
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
                // Отмечаем, что пользователь зашёл на сервер
                inviteData.joined = true;
                inviteData.joinedAt = new Date().toISOString();
                
                // Начисляем бонус пригласившему
                const bonusAmount = 500;
                economyManager.addBalance(referrerId, bonusAmount);
                
                // Обновляем бонусы в реферальной системе
                const referrerData = referrals[referrerId];
                referrerData.bonus = (referrerData.bonus || 0) + bonusAmount;
                
                saveReferrals(referrals);
                
                console.log(`✅ Реферал: ${member.user.tag} пришёл по приглашению от ${referrerId}`);
                
                // Отправляем уведомление пригласившему
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
    }
};
