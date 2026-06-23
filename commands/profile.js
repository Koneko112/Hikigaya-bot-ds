const economyManager = require('../config/economyManager');
const fs = require('fs');
const path = require('path');

// Файлы для статистики сообщений и инвентаря
const STATS_FILE = path.join(__dirname, '..', 'data', 'messageStats.json');
const INVENTORY_FILE = path.join(__dirname, '..', 'data', 'inventory.json');
const SHOP_FILE = path.join(__dirname, '..', 'data', 'shop.json');

// Загрузка статистики сообщений
function loadMessageStats() {
    if (!fs.existsSync(STATS_FILE)) {
        fs.writeFileSync(STATS_FILE, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
}

function saveMessageStats(data) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
}

// Загрузка инвентаря
function loadInventory() {
    if (!fs.existsSync(INVENTORY_FILE)) {
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
}

// Загрузка магазина
function loadShop() {
    if (!fs.existsSync(SHOP_FILE)) {
        return { items: [] };
    }
    return JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
}

// Обновление счётчика сообщений
function updateMessageCount(userId) {
    const stats = loadMessageStats();
    if (!stats[userId]) {
        stats[userId] = { messages: 0, voiceMinutes: 0, commands: 0 };
    }
    stats[userId].messages++;
    saveMessageStats(stats);
}

module.exports = {
    name: 'profile',
    description: 'Показать профиль пользователя',
    async execute(message, args) {
        // Определяем, чей профиль показывать
        let targetUser = message.author;
        let targetMember = message.member;
        
        if (args.length > 0) {
            const mention = message.mentions.users.first();
            if (mention) {
                targetUser = mention;
                targetMember = message.guild.members.cache.get(targetUser.id);
            }
        }
        
        const userId = targetUser.id;
        
        // Получаем данные из экономики
        const balance = economyManager.getUserBalance(userId);
        const userData = economyManager.getUserData(userId);
        
        // Получаем статистику сообщений
        const stats = loadMessageStats();
        const userStats = stats[userId] || { messages: 0, voiceMinutes: 0, commands: 0 };
        
        // Получаем инвентарь
        const inventory = loadInventory();
        const userInventory = inventory[userId] || [];
        
        // Получаем предметы из магазина
        const shop = loadShop();
        
        // Создаём список предметов в инвентаре
        let inventoryList = '';
        if (userInventory.length === 0) {
            inventoryList = '📦 **Пусто**\nИспользуйте `!shop` и `!buy <id>` чтобы купить предметы';
        } else {
            // Группируем одинаковые предметы
            const itemCount = {};
            userInventory.forEach(item => {
                if (item.id) {
                    itemCount[item.id] = (itemCount[item.id] || 0) + 1;
                }
            });
            
            for (const [itemId, count] of Object.entries(itemCount)) {
                const shopItem = shop.items.find(i => i.id == itemId);
                const itemName = shopItem ? shopItem.name : `Предмет #${itemId}`;
                const emoji = shopItem ? (shopItem.emoji || '🎁') : '🎁';
                inventoryList += `${emoji} **${itemName}** x${count}\n`;
            }
        }
        
        // Создаём прогресс-бар для сообщений
        const messageLevel = Math.floor(userStats.messages / 100);
        const messageProgress = userStats.messages % 100;
        const progressBar = '█'.repeat(Math.floor(messageProgress / 10)) + '░'.repeat(10 - Math.floor(messageProgress / 10));
        
        // Форматируем дату регистрации
        const joinDate = targetMember ? targetMember.joinedAt : targetUser.createdAt;
        const formattedJoinDate = new Date(joinDate).toLocaleDateString('ru-RU');
        
        // Создаём красивый ответ
        const profileText = `
╔══════════════════════════════════╗
║          👤 **ПРОФИЛЬ**                 ║
╚══════════════════════════════════╝

**${targetUser.username}**#${targetUser.discriminator || '0000'}

📊 **ОСНОВНАЯ СТАТИСТИКА**
├ 💰 Баланс: **${balance}** монет
├ 💎 Всего заработано: **${userData.total_earned || 0}** монет
├ 🛍 Потрачено: **${userData.total_spent || 0}** монет
└ 🏦 В банке: **${userData.bank || 0}** монет

💬 **АКТИВНОСТЬ**
├ 📝 Сообщений: **${userStats.messages}**
├ 🎮 Команд использовано: **${userStats.commands}**
├ 📈 Уровень сообщений: **${messageLevel}**
└ ═══ [${progressBar}] ${messageProgress}% к след. уровню

📅 **ДАТЫ**
├ 🕐 На сервере с: ${formattedJoinDate}
└ 🎂 Аккаунт создан: ${new Date(targetUser.createdAt).toLocaleDateString('ru-RU')}

🎒 **ИНВЕНТАРЬ**
${inventoryList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ **Совет:** Используйте \`!work\` и \`!daily\` для заработка!
        `;
        
        message.reply(profileText);
        
        // Обновляем счётчик команд
        const statsUpdate = loadMessageStats();
        if (!statsUpdate[message.author.id]) {
            statsUpdate[message.author.id] = { messages: 0, voiceMinutes: 0, commands: 0 };
        }
        statsUpdate[message.author.id].commands++;
        saveMessageStats(statsUpdate);
    }
};

// Экспортируем функцию обновления сообщений для использования в messageCreate
module.exports.updateMessageCount = updateMessageCount;