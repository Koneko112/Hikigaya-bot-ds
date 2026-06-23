const fs = require('fs');
const path = require('path');
const economyManager = require('../config/economyManager');

const SHOP_FILE = path.join(__dirname, '..', 'data', 'shop.json');
const INVENTORY_FILE = path.join(__dirname, '..', 'data', 'inventory.json');

function loadShop() {
    return JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
}

function loadInventory() {
    if (!fs.existsSync(INVENTORY_FILE)) {
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
}

function saveInventory(data) {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'buy',
    description: 'Купить предмет из магазина',
    async execute(message, args) {
        const itemId = parseInt(args[0]);
        
        if (isNaN(itemId)) {
            return message.reply('❌ Использование: !buy <id>');
        }
        
        const shop = loadShop();
        const item = shop.items.find(i => i.id === itemId);
        
        if (!item) {
            return message.reply('❌ Товар не найден');
        }
        
        const balance = economyManager.getUserBalance(message.author.id);
        if (balance < item.price) {
            return message.reply(`❌ Недостаточно средств! Нужно **${item.price}** монет`);
        }
        
        economyManager.addBalance(message.author.id, -item.price);
        
        const inventory = loadInventory();
        if (!inventory[message.author.id]) {
            inventory[message.author.id] = [];
        }
        inventory[message.author.id].push({
            id: item.id,
            name: item.name,
            purchasedAt: Date.now()
        });
        saveInventory(inventory);
        
        message.reply(`✅ Вы купили **${item.name}** за ${item.price} монет!`);
    }
};