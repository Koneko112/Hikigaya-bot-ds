const fs = require('fs');
const path = require('path');

const paidRolesFile = path.join(__dirname, '..', 'data', 'paid-roles.json');

function loadPaidRoles() {
    if (!fs.existsSync(paidRolesFile)) {
        fs.writeFileSync(paidRolesFile, JSON.stringify({ plans: [], purchases: {} }));
        return { plans: [], purchases: {} };
    }
    return JSON.parse(fs.readFileSync(paidRolesFile, 'utf8'));
}

function savePaidRoles(data) {
    fs.writeFileSync(paidRolesFile, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'buy-role',
    description: '💎 Купить роль на сервере',
    async execute(message, args) {
        const planName = args.join(' ');
        if (!planName) {
            return message.reply('❌ Укажи название роли: `!buy-role Sponsor`');
        }

        const data = loadPaidRoles();
        const plan = data.plans.find(p => p.name.toLowerCase() === planName.toLowerCase());
        if (!plan) {
            return message.reply(`❌ Роль "${planName}" не найдена. Доступные: ${data.plans.map(p => p.name).join(', ')}`);
        }

        const guild = message.guild;
        const member = message.member;

        // Проверяем, есть ли уже такая роль у пользователя
        const existingPurchase = data.purchases[message.author.id];
        if (existingPurchase) {
            const existingPlan = data.plans.find(p => p.id === existingPurchase.planId);
            if (existingPlan) {
                return message.reply(`❌ У тебя уже есть роль "${existingPlan.name}"! Она истекает ${new Date(existingPurchase.expiresAt).toLocaleDateString()}`);
            }
        }

        // Создаём роль
        const role = await guild.roles.create({
            name: `💎 ${plan.name}`,
            color: plan.color || '#00ff88',
            position: plan.position || 5,
            permissions: plan.permissions || [],
            reason: `Покупка роли пользователем ${message.author.tag}`
        });

        // Выдаём роль
        await member.roles.add(role);

        // Сохраняем покупку
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.duration);

        data.purchases[message.author.id] = {
            planId: plan.id,
            roleId: role.id,
            expiresAt: expiresAt.toISOString()
        };
        savePaidRoles(data);

        // Уведомление
        const embed = {
            title: '💎 Роль куплена!',
            description: `Ты получил роль **${role.name}** на **${plan.duration}** дней!`,
            color: plan.color || '#00ff88',
            fields: [
                { name: '📋 Права', value: plan.permissions.join(', ') || 'Нет специальных прав', inline: true },
                { name: '⏳ Истекает', value: expiresAt.toLocaleDateString(), inline: true }
            ],
            footer: { text: 'Спасибо за поддержку проекта!' }
        };

        message.reply({ embeds: [embed] });
    }
};
