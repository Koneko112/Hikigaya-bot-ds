const express = require('express');
const router = express.Router();
const passport = require('passport');
const economyManager = require('../config/economyManager');
const configManager = require('../config/configManager');
const fs = require('fs');
const path = require('path');
const adminIds = ['629216255873908736', '1091889146265604117'];
// ============= СИСТЕМА РОЛЕЙ НА САЙТЕ =============
const siteRolesFile = path.join(__dirname, '..', 'data', 'site-roles.json');

function loadSiteRoles() {
    if (!fs.existsSync(siteRolesFile)) {
        fs.writeFileSync(siteRolesFile, JSON.stringify({ roles: [], users: {} }));
        return { roles: [], users: {} };
    }
    return JSON.parse(fs.readFileSync(siteRolesFile, 'utf8'));
}

function saveSiteRoles(data) {
    fs.writeFileSync(siteRolesFile, JSON.stringify(data, null, 2));
}

function getUserSiteRoles(userId) {
    const data = loadSiteRoles();
    return data.users[userId] || [];
}

function hasPermission(userId, permission) {
    const data = loadSiteRoles();
    const userRoles = data.users[userId] || [];
    for (const roleId of userRoles) {
        const role = data.roles.find(r => r.id === roleId);
        if (role && role.permissions && role.permissions.includes(permission)) {
            return true;
        }
    }
    return false;
}

function isSiteAdmin(userId) {
    return hasPermission(userId, 'admin') || hasPermission(userId, 'roles');
}
// ============= ПРОВЕРКА КЛИЕНТА =============
function getDiscordClient() {
    if (!global.discordClient) {
        console.error('❌ Discord клиент не инициализирован!');
        return null;
    }
    return global.discordClient;
}
// ============= КЕШ УЧАСТНИКОВ =============
let membersCache = {
    data: null,
    timestamp: 0,
    ttl: 60000 // 1 минута
};

async function getCachedMembers(guildId) {
    console.log('🔍 Проверка global.discordClient:', global.discordClient ? '✅ Есть' : '❌ Нет');
    
    const now = Date.now();
    if (membersCache.data && (now - membersCache.timestamp) < membersCache.ttl) {
        return membersCache.data;
    }
    
    const client = getDiscordClient();
    if (!client) {
        console.error('❌ Не удалось получить клиент Discord');
        return [];
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error(`❌ Сервер ${guildId} не найден`);
        return [];
    }
    
    try {
        await guild.members.fetch();
        const members = guild.members.cache.map(m => ({
            id: m.id,
            username: m.user.username,
            discriminator: m.user.discriminator,
            avatar: m.user.displayAvatarURL(),
            joinedAt: m.joinedAt,
            roles: m.roles.cache.map(r => r.name).join(', ')
        }));
        
        membersCache.data = members;
        membersCache.timestamp = now;
        return members;
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        return [];
    }
}
// ============= ФУНКЦИЯ ПОЛУЧЕНИЯ РОЛИ С DISCORD =============
async function getUserHighestRole(userId, guildId) {
    try {
        const client = getDiscordClient();
        if (!client) {
            console.log('❌ Клиент не найден');
            return 'Пользователь';
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.log('❌ Сервер не найден:', guildId);
            return 'Пользователь';
        }

        // Пытаемся получить участника из кэша
        let member = guild.members.cache.get(userId);
        
        // Если нет в кэше — загружаем
        if (!member) {
            try {
                console.log(`⏳ Загружаем участника ${userId}...`);
                member = await guild.members.fetch(userId);
                console.log(`✅ Участник ${userId} загружен`);
            } catch (fetchError) {
                console.log(`❌ Не удалось загрузить участника ${userId}:`, fetchError.message);
                return 'Пользователь';
            }
        }

        if (member.roles.cache.size <= 1) return 'Пользователь';

        const highestRole = member.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first();

        return highestRole ? highestRole.name : 'Пользователь';
    } catch (error) {
        console.error('Ошибка получения роли:', error);
        return 'Пользователь';
    }
}
// ============= МИДЛВЭРЫ =============
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/');
    
    const userId = req.user.id;
    const adminIds = ['629216255873908736', '1091889146265604117'];
    if (adminIds.includes(userId)) return next();
    
    // Проверяем, есть ли у пользователя право "admin" или "roles"
    // Только они дают доступ ко всей админке
    if (hasPermission(userId, 'admin') || hasPermission(userId, 'roles')) {
        return next();
    }
    
    res.redirect('/');
}

// ============= МАРШРУТЫ =============
router.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

router.get('/auth/discord', passport.authenticate('discord'));
router.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => res.redirect('/dashboard')
);

router.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// ============= ПОЛЬЗОВАТЕЛЬСКИЕ СТРАНИЦЫ =============
router.get('/dashboard', isAuthenticated, (req, res) => {
    const config = configManager.getConfig();
    const users = economyManager.getAllUsers();
    res.render('dashboard', { user: req.user, config, users });
});

// ============= ПРОФИЛЬ =============
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const balance = economyManager.getUserBalance(userId);
        const userData = economyManager.getUserData(userId);

        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID ТВОЕГО СЕРВЕРА
        const role = await getUserHighestRole(userId, guildId);

        const statsFile = path.join(__dirname, '..', 'data', 'messageStats.json');
        let messageStats = {};
        if (fs.existsSync(statsFile)) {
            messageStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
        const userStats = messageStats[userId] || { messages: 0, commands: 0 };

        // ===== ЧИТАЕМ ИНВЕНТАРЬ =====
        const inventoryFile = path.join(__dirname, '..', 'data', 'inventory.json');
        let inventory = {};
        if (fs.existsSync(inventoryFile)) {
            inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
        }
        const userInventory = inventory[userId] || [];

        res.render('profile', {
            user: req.user,
            balance: balance || 0,
            totalEarned: userData.total_earned || 0,
            totalSpent: userData.total_spent || 0,
            messages: userStats.messages || 0,
            commands: userStats.commands || 0,
            userData: userData,
            role: role,
            inventory: userInventory // ← ЭТА СТРОЧКА ТЕПЕРЬ ЕСТЬ
        });
    } catch (error) {
        console.error('Ошибка профиля:', error);
        res.status(500).send('Ошибка загрузки профиля');
    }
});
router.get('/shop', isAuthenticated, async (req, res) => {
    try {
        const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
        let shop = { items: [], roles: [] };
        if (fs.existsSync(shopFile)) {
            shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
        }
        
        const balance = economyManager.getUserBalance(req.user.id);
        
        // Проверяем, какие роли уже есть у пользователя
        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID СВОЕГО СЕРВЕРА
        const guild = global.discordClient.guilds.cache.get(guildId);
        let userRoles = [];
        if (guild) {
            try {
                const member = await guild.members.fetch(req.user.id);
                userRoles = member.roles.cache.map(r => r.id);
            } catch (e) {
                console.log('⚠️ Не удалось получить роли пользователя');
            }
        }
        
        res.render('shop', { 
            user: req.user, 
            items: shop.items || [], 
            roles: shop.roles || [],
            balance: balance || 0,
            userRoles: userRoles // ← ЭТА СТРОЧКА ТЕПЕРЬ ЕСТЬ
        });
    } catch (error) {
        console.error('Ошибка загрузки магазина:', error);
        res.status(500).send('Ошибка загрузки магазина');
    }
});

router.get('/youtube', isAuthenticated, (req, res) => {
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    res.render('youtube', { user: req.user, channels: youtubeData.channels });
});

// ============= АДМИН-ПАНЕЛЬ =============
router.get('/admin', isAdmin, (req, res) => {
    const users = economyManager.getAllUsers();
    const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
    res.render('admin/dashboard', { user: req.user, stats: { totalUsers: users.length, totalBalance } });
});

router.get('/admin/users', isAdmin, (req, res) => {
    const users = economyManager.getAllUsers();
    res.render('admin/users', { user: req.user, users });
});

router.get('/admin/youtube', isAdmin, (req, res) => {
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    res.render('admin/youtube', { user: req.user, channels: youtubeData.channels });
});

router.get('/admin/settings', isAdmin, (req, res) => {
    const config = configManager.getConfig();
    res.render('admin/settings', { user: req.user, config });
});

router.get('/admin/moderation', isAdmin, (req, res) => {
    res.render('admin/moderation', { user: req.user });
});
router.get('/warnings', isAdmin, (req, res) => {
    const warnings = require('../config/warningsManager').getAllWarnings();
    res.render('warnings', { user: req.user, warnings });
});
// ============= API ЭНДПОИНТЫ =============
router.post('/api/admin/economy/add', isAdmin, (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Укажите userId и amount' });
    economyManager.addBalance(userId, parseInt(amount));
    res.json({ success: true });
});

router.post('/api/admin/economy/remove', isAdmin, (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'Укажите userId и amount' });
    economyManager.addBalance(userId, -parseInt(amount));
    res.json({ success: true });
});

router.post('/api/admin/youtube/add', isAdmin, (req, res) => {
    const { channelId, channelName } = req.body;
    if (!channelId || !channelName) return res.status(400).json({ error: 'Укажите ID и название' });
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    if (youtubeData.channels.find(c => c.channelId === channelId)) {
        return res.status(400).json({ error: 'Канал уже отслеживается' });
    }
    youtubeData.channels.push({ channelId, channelName, discordChannelId: null, lastVideoId: null, addedAt: new Date().toISOString() });
    fs.writeFileSync(youtubeFile, JSON.stringify(youtubeData, null, 2));
    res.redirect('/admin/youtube');
});

router.post('/api/admin/youtube/remove', isAdmin, (req, res) => {
    const { channelId } = req.body;
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    youtubeData.channels = youtubeData.channels.filter(c => c.channelId !== channelId);
    fs.writeFileSync(youtubeFile, JSON.stringify(youtubeData, null, 2));
    res.redirect('/admin/youtube');
});

router.post('/api/shop/buy', isAuthenticated, (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;
    const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
    let shop = { items: [] };
    if (fs.existsSync(shopFile)) shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
    const item = shop.items.find(i => i.id == itemId);
    if (!item) return res.redirect('/shop?error=Товар не найден');
    const balance = economyManager.getUserBalance(userId);
    if (balance < item.price) return res.redirect('/shop?error=Недостаточно средств');
    economyManager.addBalance(userId, -item.price);
    res.redirect('/shop?success=Покупка успешна');
});

// ============= API МОДЕРАЦИИ =============
router.post('/api/admin/mute', isAdmin, async (req, res) => {
    try {
        const { userId, duration, reason } = req.body;
        
        console.log('📩 Запрос на мут:', { userId, duration, reason });

        if (!userId || !duration) {
            return res.json({ success: false, error: 'Укажите ID пользователя и длительность' });
        }

        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID СВОЕГО СЕРВЕРА
        const guild = global.discordClient.guilds.cache.get(guildId);
        
        if (!guild) {
            console.error('❌ Сервер не найден');
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        // Загружаем участника
        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch (fetchError) {
            console.error('❌ Пользователь не найден:', fetchError.message);
            return res.json({ success: false, error: 'Пользователь не найден на сервере' });
        }

        if (!member) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        // Проверяем, можно ли замутить
        if (!member.moderatable) {
            return res.json({ success: false, error: 'Бот не может замутить этого пользователя (роль выше или нет прав)' });
        }

        // Преобразуем длительность
        const ms = require('ms');
        const durationMs = ms(duration);
        if (!durationMs) {
            return res.json({ success: false, error: 'Неверный формат времени. Используйте: 10m, 1h, 1d' });
        }

        if (durationMs > 2419200000) { // 28 дней
            return res.json({ success: false, error: 'Максимальная длительность мута — 28 дней' });
        }

        // Выдаём мут
        await member.timeout(durationMs, reason || 'Мут через сайт');
        
        console.log(`✅ Пользователь ${member.user.username} замучен на ${duration}`);
        res.json({ success: true, message: `Пользователь ${member.user.username} замучен на ${duration}` });

    } catch (error) {
        console.error('❌ Ошибка мута:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});
router.post('/api/admin/role', isAdmin, async (req, res) => {
    try {
        const { userId, roleId, action } = req.body;
        
        console.log(`📩 Запрос на выдачу роли: userId=${userId}, roleId=${roleId}, action=${action}`);

        if (!userId || !roleId) {
            return res.json({ success: false, error: 'Укажите ID пользователя и роль' });
        }

        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID СВОЕГО СЕРВЕРА
        const guild = global.discordClient.guilds.cache.get(guildId);
        
        if (!guild) {
            console.error('❌ Сервер не найден');
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        // Загружаем участника
        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch (fetchError) {
            console.error('❌ Пользователь не найден:', fetchError.message);
            return res.json({ success: false, error: 'Пользователь не найден на сервере' });
        }

        if (!member) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        // Загружаем роль
        let role;
        try {
            role = await guild.roles.fetch(roleId);
        } catch (roleError) {
            console.error('❌ Роль не найдена:', roleError.message);
            return res.json({ success: false, error: 'Роль не найдена на сервере' });
        }

        if (!role) {
            return res.json({ success: false, error: 'Роль не найдена' });
        }

        console.log(`🔍 Найдены: пользователь ${member.user.username}, роль ${role.name}`);

        // Проверяем, может ли бот выдавать роль
        if (!member.manageable) {
            return res.json({ success: false, error: 'Бот не может управлять этим пользователем (роль выше или нет прав)' });
        }

        if (!role.editable) {
            return res.json({ success: false, error: 'Бот не может управлять этой ролью (она выше роли бота)' });
        }

        // Выдаём или забираем роль
        if (action === 'add') {
            await member.roles.add(role);
            console.log(`✅ Роль ${role.name} выдана пользователю ${member.user.username}`);
            res.json({ success: true, message: `Роль ${role.name} выдана пользователю ${member.user.username}` });
        } else {
            await member.roles.remove(role);
            console.log(`✅ Роль ${role.name} убрана у пользователя ${member.user.username}`);
            res.json({ success: true, message: `Роль ${role.name} убрана у пользователя ${member.user.username}` });
        }

    } catch (error) {
        console.error('❌ Ошибка выдачи роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});
// ============= ВСЕ ПОЛЬЗОВАТЕЛИ СЕРВЕРА =============
router.get('/admin/all-users', isAdmin, async (req, res) => {
    try {
        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID ТВОЕГО СЕРВЕРА
        const members = await getCachedMembers(guildId);
        
        res.render('admin/all-users', { 
            user: req.user, 
            members: members 
        });
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        res.status(500).send('Ошибка загрузки участников');
    }
});
// ============= ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ПО ID =============
router.get('/user/:userId', isAuthenticated, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const guildId = '1208677626961727528'; // ⚠️ ЗАМЕНИ НА ID ТВОЕГО СЕРВЕРА
        
        // Получаем участника из кеша
        const members = await getCachedMembers(guildId);
        const memberData = members.find(m => m.id === targetUserId);
        
        if (!memberData) {
            return res.status(404).send('Пользователь не найден на сервере');
        }

        // Получаем данные из экономики
        const balance = economyManager.getUserBalance(targetUserId);
        const userData = economyManager.getUserData(targetUserId);

        // Получаем роль
        const role = await getUserHighestRole(targetUserId, guildId);

        // Статистика сообщений
        const statsFile = path.join(__dirname, '..', 'data', 'messageStats.json');
        let messageStats = {};
        if (fs.existsSync(statsFile)) {
            messageStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
        const userStats = messageStats[targetUserId] || { messages: 0, commands: 0 };

        // Инвентарь
        const inventoryFile = path.join(__dirname, '..', 'data', 'inventory.json');
        let inventory = {};
        if (fs.existsSync(inventoryFile)) {
            inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
        }
        const userInventory = inventory[targetUserId] || [];

        res.render('user-profile', {
            user: req.user,
            targetUser: memberData,
            balance: balance || 0,
            totalEarned: userData.total_earned || 0,
            totalSpent: userData.total_spent || 0,
            messages: userStats.messages || 0,
            commands: userStats.commands || 0,
            role: role,
            inventory: userInventory,
           isAdmin: ['629216255873908736', '1091889146265604117'].includes(req.user.id)
        });
    } catch (error) {
        console.error('Ошибка загрузки профиля пользователя:', error);
        res.status(500).send('Ошибка загрузки профиля: ' + error.message);
    }
});
// ============= РЕФЕРАЛЬНАЯ СИСТЕМА =============
const referralsFile = path.join(__dirname, '..', 'data', 'referrals.json');

function loadReferrals() {
    if (!fs.existsSync(referralsFile)) {
        fs.writeFileSync(referralsFile, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(referralsFile, 'utf8'));
}

function saveReferrals(data) {
    fs.writeFileSync(referralsFile, JSON.stringify(data, null, 2));
}

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Страница рефералов
router.get('/referrals', isAuthenticated, (req, res) => {
    const referrals = loadReferrals();
    const userRef = referrals[req.user.id] || { code: null, invited: [], bonus: 0 };
    
    if (!userRef.code) {
        userRef.code = generateCode();
        referrals[req.user.id] = userRef;
        saveReferrals(referrals);
    }
    
    // Ссылка для приглашения
    const inviteLink = `${req.protocol}://${req.get('host')}/invite/${userRef.code}`;
    
    res.render('referrals', {
        user: req.user,
        refCode: userRef.code,
        inviteLink: inviteLink,
        invited: userRef.invited || [],
        bonus: userRef.bonus || 0
    });
});

// Страница приглашения (по ссылке)
router.get('/invite/:code', async (req, res) => {
    const code = req.params.code;
    const referrals = loadReferrals();
    
    // Находим, кому принадлежит код
    let referrerId = null;
    for (const [userId, data] of Object.entries(referrals)) {
        if (data.code === code) {
            referrerId = userId;
            break;
        }
    }
    
    if (!referrerId) {
        return res.status(404).send('Неверный код приглашения');
    }
    
    // Сохраняем в сессию, чтобы при заходе на сервер начислить бонус
    req.session.referrerId = referrerId;
    
    res.render('invite', {
         user: req.user,
        referrerId: referrerId,
        code: code
    });
});

// API: получение бонуса за приглашение
router.post('/api/referrals/claim', isAuthenticated, (req, res) => {
    const referrals = loadReferrals();
    const userRef = referrals[req.user.id];
    
    if (!userRef || !userRef.invited || userRef.invited.length === 0) {
        return res.json({ success: false, error: 'У вас нет приглашённых' });
    }
    
    // Проверяем, есть ли невыплаченные бонусы
    const unclaimed = userRef.invited.filter(i => !i.claimed);
    if (unclaimed.length === 0) {
        return res.json({ success: false, error: 'Все бонусы уже получены' });
    }
    
    const bonusAmount = 500 * unclaimed.length;
    economyManager.addBalance(req.user.id, bonusAmount);
    
    // Отмечаем как выплаченные
    userRef.invited.forEach(i => { i.claimed = true; });
    userRef.bonus = (userRef.bonus || 0) + bonusAmount;
    saveReferrals(referrals);
    
    res.json({ success: true, message: `Вы получили ${bonusAmount} монет за ${unclaimed.length} приглашений!` });
});
// ============= ПОКУПКА РОЛИ =============
router.post('/api/shop/buy-role', isAuthenticated, async (req, res) => {
    try {
        const { roleId } = req.body;
        const userId = req.user.id;
        
        const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
        let shop = { items: [], roles: [] };
        if (fs.existsSync(shopFile)) {
            shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
        }
        
        const roleData = shop.roles.find(r => r.id === roleId);
        if (!roleData) {
            return res.json({ success: false, error: 'Роль не найдена в магазине' });
        }
        
        const balance = economyManager.getUserBalance(userId);
        if (balance < roleData.price) {
            return res.json({ success: false, error: `Недостаточно средств! Нужно ${roleData.price} монет` });
        }
        
        // Проверяем, есть ли у пользователя уже эта роль
        const guildId = '1208677626961727528';
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }
        
        const member = await guild.members.fetch(userId);
        if (!member) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }
        
        const role = await guild.roles.fetch(roleId);
        if (!role) {
            return res.json({ success: false, error: 'Роль не найдена на сервере' });
        }
        
        // Проверяем, есть ли уже такая роль
        if (member.roles.cache.has(roleId)) {
            return res.json({ success: false, error: 'У вас уже есть эта роль!' });
        }
        
        // Списываем монеты и выдаём роль
        economyManager.addBalance(userId, -roleData.price);
        await member.roles.add(role);
        
        res.json({ success: true, message: `Вы купили роль ${role.name} за ${roleData.price} монет!` });
        
    } catch (error) {
        console.error('Ошибка покупки роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});
// ============= СОЗДАНИЕ РОЛИ =============
router.post('/api/admin/create-role', isAdmin, async (req, res) => {
    try {
        const { name, color } = req.body;
        
        if (!name) {
            return res.json({ success: false, error: 'Укажите название роли' });
        }
        
        const guildId = '1208677626961727528';
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }
        
        // Создаём роль
        const role = await guild.roles.create({
            name: name,
            color: color || '#99aab5',
            reason: 'Создана через сайт',
            permissions: []
        });
        
        // Добавляем в магазин
        const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
        let shop = { items: [], roles: [] };
        if (fs.existsSync(shopFile)) {
            shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
        }
        
        // Проверяем, нет ли уже такой роли
        if (!shop.roles.find(r => r.id === role.id)) {
            shop.roles.push({
                id: role.id,
                name: role.name,
                price: 500,
                color: color || '#99aab5'
            });
            fs.writeFileSync(shopFile, JSON.stringify(shop, null, 2));
        }
        
        res.json({ 
            success: true, 
            message: `Роль ${role.name} создана и добавлена в магазин за 500 монет!`,
            roleId: role.id 
        });
        
    } catch (error) {
        console.error('Ошибка создания роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});
// ============= УПРАВЛЕНИЕ РОЛЯМИ НА САЙТЕ =============
router.get('/admin/roles', isAdmin, (req, res) => {
    const data = loadSiteRoles();
    res.render('admin/roles', { 
        user: req.user, 
        roles: data.roles, 
        users: data.users
    });
});

router.post('/api/admin/roles/create', isAdmin, (req, res) => {
    const { name, permissions } = req.body;
    if (!name) return res.json({ success: false, error: 'Укажите название роли' });
    
    const data = loadSiteRoles();
    const id = name.toLowerCase().replace(/\s/g, '-');
    
    if (data.roles.find(r => r.id === id)) {
        return res.json({ success: false, error: 'Роль с таким ID уже существует' });
    }
    
    const perms = permissions ? permissions.split(',').map(p => p.trim()) : [];
    data.roles.push({ id, name, permissions: perms });
    saveSiteRoles(data);
    res.json({ success: true, message: `Роль "${name}" создана!` });
});

router.post('/api/admin/roles/assign', isAdmin, (req, res) => {
    const { userId, roleId } = req.body;
    if (!userId || !roleId) return res.json({ success: false, error: 'Укажите пользователя и роль' });
    
    const data = loadSiteRoles();
    if (!data.roles.find(r => r.id === roleId)) {
        return res.json({ success: false, error: 'Роль не найдена' });
    }
    
    if (!data.users[userId]) data.users[userId] = [];
    if (data.users[userId].includes(roleId)) {
        return res.json({ success: false, error: 'У пользователя уже есть эта роль' });
    }
    
    data.users[userId].push(roleId);
    saveSiteRoles(data);
    res.json({ success: true, message: `Роль назначена!` });
});

router.post('/api/admin/roles/remove', isAdmin, (req, res) => {
    const { userId, roleId } = req.body;
    if (!userId || !roleId) return res.json({ success: false, error: 'Укажите пользователя и роль' });
    
    const data = loadSiteRoles();
    if (data.users[userId]) {
        data.users[userId] = data.users[userId].filter(r => r !== roleId);
        if (data.users[userId].length === 0) delete data.users[userId];
        saveSiteRoles(data);
    }
    res.json({ success: true, message: `Роль убрана!` });
});

router.post('/api/admin/roles/delete', isAdmin, (req, res) => {
    const { roleId } = req.body;
    if (!roleId) return res.json({ success: false, error: 'Укажите ID роли' });
    
    const data = loadSiteRoles();
    data.roles = data.roles.filter(r => r.id !== roleId);
    for (const userId in data.users) {
        data.users[userId] = data.users[userId].filter(r => r !== roleId);
        if (data.users[userId].length === 0) delete data.users[userId];
    }
    saveSiteRoles(data);
    res.json({ success: true, message: `Роль удалена!` });
});

// ============= ПОИСК ПОЛЬЗОВАТЕЛЕЙ =============
router.get('/api/users/search', isAdmin, async (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    try {
        const guildId = '1208677626961727528';
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) return res.json({ users: [] });
        
        await guild.members.fetch();
        const members = guild.members.cache
            .filter(m => m.user.username.toLowerCase().includes(query) || m.id.includes(query))
            .map(m => ({ id: m.id, username: m.user.username, avatar: m.user.displayAvatarURL() }))
            .slice(0, 20);
        res.json({ users: members });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        res.json({ users: [] });
    }
});

module.exports = router;
module.exports = router;
