const fs = require('fs');
const path = require('path');
const economyManager = require('../config/economyManager');

const SHOP_FILE = path.join(__dirname, '..', 'data', 'shop.json');

function loadShop() {
    if (!fs.existsSync(SHOP_FILE)) {
        const defaultShop = {
            items: [
                { id: 1, name: '🎣 Удочка', price: 500, description: 'Позволяет ловить рыбу' },
                { id: 2, name: '⛏️ Кирка', price: 800, description: 'Добыча руды' },
                { id: 3, name: '🐉 Питомец', price: 2000, description: 'Верный спутник' }
            ]
        };
        fs.writeFileSync(SHOP_FILE, JSON.stringify(defaultShop, null, 2));
        return defaultShop;
    }
    return JSON.parse(fs.readFileSync(SHOP_FILE, 'utf8'));
}

module.exports = {
    name: 'shop',
    description: 'Просмотреть магазин',
    execute(message) {
        const shop = loadShop();
        
        let reply = '🛒 **МАГАЗИН**\n\n';
        shop.items.forEach(item => {
            reply += `${item.id}. ${item.name} - **${item.price}** монет\n`;
            reply += `   ${item.description}\n\n`;
        });
        reply += `\n💡 Используй: !buy <id>`;
        
        message.reply(reply);
    }
};