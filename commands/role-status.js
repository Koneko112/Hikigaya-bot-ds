const fs = require('fs');
const path = require('path');

const paidRolesFile = path.join(__dirname, '..', 'data', 'paid-roles.json');

module.exports = {
    name: 'role-status',
    description: '📊 Проверить статус купленной роли',
    async execute(message) {
        const data = JSON.parse(fs.readFileSync(paidRolesFile, 'utf8'));
        const purchase = data.purchases[message.author.id];

        if (!purchase) {
            return message.reply('❌ У тебя нет купленных ролей');
        }

        const plan = data.plans.find(p => p.id === purchase.planId);
        if (!plan) {
            return message.reply('❌ План больше не существует');
        }

        const role = message.guild.roles.cache.get(purchase.roleId);
        if (!role) {
            return message.reply('❌ Роль была удалена на сервере');
        }

        const expiresAt = new Date(purchase.expiresAt);
        const now = new Date();

        if (expiresAt < now) {
            return message.reply(`⏰ Роль "${role.name}" истекла!`);
        }

        const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        const embed = {
            title: '📊 Статус роли',
            color: role.color,
            fields: [
                { name: '🎭 Роль', value: role.name, inline: true },
                { name: '⏳ Осталось', value: `${daysLeft} дней`, inline: true },
                { name: '📋 Права', value: plan.permissions.join(', ') || 'Нет', inline: false }
            ]
        };

        message.reply({ embeds: [embed] });
    }
};
