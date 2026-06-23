const economyManager = require('../config/economyManager');
const configManager = require('../config/configManager');

// Хранилище кулдаунов (в памяти)
const workCooldowns = new Map();

module.exports = {
    name: 'work',
    description: 'Работать и получать монеты',
    async execute(message, args) {
        const userId = message.author.id;
        const config = configManager.getConfig();
        const minAmount = config.economy?.workMin || 50;
        const maxAmount = config.economy?.workMax || 200;
        
        // Проверяем кулдаун (10 минут)
        const lastWork = workCooldowns.get(userId) || 0;
        const cooldownTime = 10 * 60 * 1000; // 10 минут
        const timeLeft = lastWork + cooldownTime - Date.now();
        
        if (timeLeft > 0) {
            const minutesLeft = Math.ceil(timeLeft / 60000);
            return message.reply(`❌ Вы слишком устали! Отдохните **${minutesLeft}** минут перед следующей работой.`);
        }
        
        // Рассчитываем заработок
        const earnings = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
        
        // Выдаём монеты
        economyManager.addBalance(userId, earnings);
        workCooldowns.set(userId, Date.now());
        
        // Случайные сообщения для разнообразия
        const workMessages = [
            '💼 Вы поработали программистом',
            '🍕 Вы развезли пиццу',
            '📚 Вы провели урок',
            '🔧 Вы починили компьютеры',
            '🎨 Вы нарисовали заказ',
            '📝 Вы написали статью',
            '🎵 Вы дали концерт',
            '🏗️ Вы поработали на стройке'
        ];
        
        const randomMessage = workMessages[Math.floor(Math.random() * workMessages.length)];
        
        message.reply(`💼 **РАБОТА**\n${randomMessage}\n💰 Заработано: **+${earnings}** монет\n📊 Баланс: **${economyManager.getUserBalance(userId)}** монет`);
    }
};