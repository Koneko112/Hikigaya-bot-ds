const fs = require('fs');
const path = require('path');

const ECONOMY_FILE = path.join(__dirname, '..', 'data', 'economy.json');

function loadEconomy() {
    try {
        if (!fs.existsSync(ECONOMY_FILE)) {
            fs.writeFileSync(ECONOMY_FILE, JSON.stringify({}));
            return {};
        }
        return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
    } catch (error) {
        console.error('Ошибка загрузки economy.json:', error);
        return {};
    }
}

function saveEconomy(data) {
    try {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения economy.json:', error);
    }
}

function getUserData(userId) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = {
            balance: 0,
            lastDaily: null,
            inventory: []
        };
        saveEconomy(economy);
    }
    return economy[userId];
}

function getUserBalance(userId) {
    return getUserData(userId).balance;
}

function addBalance(userId, amount) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = {
            balance: 0,
            lastDaily: null,
            inventory: []
        };
    }
    economy[userId].balance += amount;
    saveEconomy(economy);
    return economy[userId].balance;
}

function setLastDaily(userId, date) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = {
            balance: 0,
            lastDaily: null,
            inventory: []
        };
    }
    economy[userId].lastDaily = date;
    saveEconomy(economy);
}

function canTakeDaily(userId) {
    const data = getUserData(userId);
    if (!data.lastDaily) return true;
    
    const lastDaily = new Date(data.lastDaily);
    const now = new Date();
    const diff = now - lastDaily;
    const hours24 = 24 * 60 * 60 * 1000;
    
    return diff >= hours24;
}

function getInventory(userId) {
    return getUserData(userId).inventory || [];
}

function addToInventory(userId, item) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = {
            balance: 0,
            lastDaily: null,
            inventory: []
        };
    }
    if (!economy[userId].inventory) {
        economy[userId].inventory = [];
    }
    economy[userId].inventory.push(item);
    saveEconomy(economy);
}

function getAllUsers() {
    const economy = loadEconomy();
    const users = [];
    for (const [userId, data] of Object.entries(economy)) {
        users.push({
            id: userId,
            balance: data.balance || 0,
            lastDaily: data.lastDaily,
            inventory: data.inventory || []
        });
    }
    return users;
}
function work(userId) {
    const min = 50;
    const max = 200;
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return addBalance(userId, amount);
}

function getLeaderboard() {
    const economy = loadEconomy();
    const users = Object.entries(economy)
        .map(([id, data]) => ({ id, balance: data.balance || 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
    return users;
}
// Добавьте эти функции, если их нет

function canTakeDaily(userId) {
    const data = getUserData(userId);
    if (!data.lastDaily) return true;
    
    const lastDaily = new Date(data.lastDaily);
    const now = new Date();
    const diff = now - lastDaily;
    const hours24 = 24 * 60 * 60 * 1000;
    
    return diff >= hours24;
}

function setLastDaily(userId, date) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = { balance: 0, lastDaily: null, inventory: [] };
    }
    economy[userId].lastDaily = date;
    saveEconomy(economy);
}

function getUserData(userId) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = { balance: 0, lastDaily: null, inventory: [] };
        saveEconomy(economy);
    }
    return economy[userId];
}
// Добавьте в getUserData:
function getUserData(userId) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = { 
            balance: 0, 
            lastDaily: null, 
            inventory: [],
            total_earned: 0,
            total_spent: 0,
            bank: 0
        };
        saveEconomy(economy);
    }
    return economy[userId];
}

// Обновите addBalance:
function addBalance(userId, amount) {
    const economy = loadEconomy();
    if (!economy[userId]) {
        economy[userId] = { 
            balance: 0, 
            lastDaily: null, 
            inventory: [],
            total_earned: 0,
            total_spent: 0,
            bank: 0
        };
    }
    economy[userId].balance += amount;
    
    // Обновляем total_earned и total_spent
    if (amount > 0) {
        economy[userId].total_earned = (economy[userId].total_earned || 0) + amount;
    } else if (amount < 0) {
        economy[userId].total_spent = (economy[userId].total_spent || 0) + Math.abs(amount);
    }
    
    saveEconomy(economy);
    return economy[userId].balance;
}
// Убедитесь, что в module.exports есть эти функции
module.exports = {
    getUserData,
    getUserBalance,
    addBalance,
    setLastDaily,
    canTakeDaily,
    getInventory,
    addToInventory,
    getAllUsers,
    work,
    getLeaderboard
};
