const economyManager = require('../config/economyManager');
const configManager = require('../config/configManager');

module.exports = {
    name: 'daily',
    description: 'Получить ежедневный бонус',
    async execute(message, args) {
        const userId = message.author.id;
        const config = configManager.getConfig();
        const dailyAmount = config.economy?.dailyAmount || 100;
        
        // Проверяем, можно ли получить дейлик
        if (!economyManager.canTakeDaily(userId)) {
            const data = economyManager.getUserData(userId);
            const lastDaily = data.lastDaily;
            const now = Date.now();
            const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - lastDaily)) / (60 * 60 * 1000));
            return message.reply(`❌ Вы уже получили ежедневный бонус! Следующий через **${hoursLeft}** часов.`);
        }
        
        // Выдаём бонус
        economyManager.addBalance(userId, dailyAmount);
        economyManager.setLastDaily(userId, Date.now());
        
        message.reply(`🎉 **Ежедневный бонус!**\n💰 Вы получили **${dailyAmount}** монет!\n📊 Новый баланс: **${economyManager.getUserBalance(userId)}** монет`);
    }
};