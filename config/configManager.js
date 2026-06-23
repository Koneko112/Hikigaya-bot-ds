const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

const defaultConfig = {
    prefix: '!',
    welcomeMessage: 'Добро пожаловать на сервер, {user}!',
    autoRoleId: null,
    economy: {
        dailyAmount: 100,
        workMin: 10,
        workMax: 50
    }
};

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
            return { ...defaultConfig };
        }
        const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...defaultConfig, ...data };
    } catch (error) {
        console.error('Ошибка загрузки config.json:', error);
        return { ...defaultConfig };
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Ошибка сохранения config.json:', error);
    }
}

function getConfig() {
    return loadConfig();
}

function updateConfig(updates) {
    const config = loadConfig();
    const newConfig = { ...config, ...updates };
    saveConfig(newConfig);
    return newConfig;
}

module.exports = {
    getConfig,
    updateConfig
};