const fs = require('fs');
const path = require('path');

const WARNINGS_FILE = path.join(__dirname, '..', 'data', 'warnings.json');

// Инициализация структуры файла
function initWarningsFile() {
    try {
        if (!fs.existsSync(WARNINGS_FILE)) {
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify({ guilds: {} }, null, 2));
            return { guilds: {} };
        }
        
        const data = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
        
        // Проверяем и исправляем структуру
        if (!data.guilds) {
            data.guilds = {};
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка загрузки warnings.json:', error);
        return { guilds: {} };
    }
}

function loadWarnings() {
    try {
        if (!fs.existsSync(WARNINGS_FILE)) {
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify({ guilds: {} }, null, 2));
            return { guilds: {} };
        }
        return JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
    } catch (error) {
        console.error('Ошибка загрузки warnings.json:', error);
        return { guilds: {} };
    }
}

function saveWarnings(data) {
    try {
        fs.writeFileSync(WARNINGS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения warnings.json:', error);
    }
}

function getUserWarnings(guildId, userId) {
    const data = loadWarnings();
    
    // Проверяем существование guildId
    if (!data.guilds[guildId]) {
        return [];
    }
    if (!data.guilds[guildId].users) {
        return [];
    }
    if (!data.guilds[guildId].users[userId]) {
        return [];
    }
    return data.guilds[guildId].users[userId];
}

function addWarning(guildId, userId, moderatorId, reason) {
    const data = loadWarnings();
    
    // Создаём структуру, если её нет
    if (!data.guilds) {
        data.guilds = {};
    }
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = { users: {} };
    }
    if (!data.guilds[guildId].users) {
        data.guilds[guildId].users = {};
    }
    if (!data.guilds[guildId].users[userId]) {
        data.guilds[guildId].users[userId] = [];
    }
    
    const warn = {
        id: `warn-${Date.now()}`,
        moderator: moderatorId,
        reason: reason,
        timestamp: Date.now()
    };
    
    data.guilds[guildId].users[userId].push(warn);
    saveWarnings(data);
    
    return data.guilds[guildId].users[userId].length;
}

function clearWarnings(guildId, userId) {
    const data = loadWarnings();
    
    if (data.guilds && data.guilds[guildId] && data.guilds[guildId].users) {
        delete data.guilds[guildId].users[userId];
        saveWarnings(data);
    }
}

function clearAllWarningsInGuild(guildId, userId) {
    return clearWarnings(guildId, userId);
}

function getAllWarnings() {
    return loadWarnings();
}

module.exports = {
    getUserWarnings,
    addWarning,
    clearWarnings,
    clearAllWarningsInGuild,
    getAllWarnings
};