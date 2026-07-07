const express = require('express');
const router = express.Router();
const passport = require('passport');
const economyManager = require('../config/economyManager');
const configManager = require('../config/configManager');
const fs = require('fs');
const path = require('path');

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
    
    if (hasPermission(userId, 'mute') || hasPermission(userId, 'ban') || hasPermission(userId, 'roles')) {
        return next();
    }
    
    res.redirect('/');
}

// ============= КЕШ УЧАСТНИКОВ =============
let membersCache = {
    data: null,
    timestamp: 0,
    ttl: 60000
};

async function getCachedMembers(guildId) {
    const now = Date.now();
    if (membersCache.data && (now - membersCache.timestamp) < membersCache.ttl) {
        return membersCache.data;
    }
    
    try {
        const client = global.discordClient;
        if (!client) return [];
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return [];
        
        await guild.members.fetch();
        const members = guild.members.cache.map(m => ({
            id: m.id,
            username: m.user.username,
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

// ============= ПОЛУЧЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ =============
async function getUserHighestRole(userId, guildId) {
    try {
        const client = global.discordClient;
        if (!client) return 'Пользователь';
        
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return 'Пользователь';
        
        let member = guild.members.cache.get(userId);
        if (!member) {
            try {
                member = await guild.members.fetch(userId);
            } catch {
                return 'Пользователь';
            }
        }
        
        const highestRole = member.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first();
        
        return highestRole ? highestRole.name : 'Пользователь';
    } catch {
        return 'Пользователь';
    }
}

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

// ============= ЗАГРУЗКА МУЗЫКИ =============
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(__dirname, '..', 'uploads', req.user.id);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.mp3', '.flac', '.wav', '.ogg', '.m4a'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат'), false);
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

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

router.get('/dashboard', isAuthenticated, (req, res) => {
    const config = configManager.getConfig();
    const users = economyManager.getAllUsers();
    res.render('dashboard', { user: req.user, config, users });
});

router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const balance = economyManager.getUserBalance(userId);
        const userData = economyManager.getUserData(userId);
        const guildId = '1208677626961727528';
        const role = await getUserHighestRole(userId, guildId);

        const statsFile = path.join(__dirname, '..', 'data', 'messageStats.json');
        let messageStats = {};
        if (fs.existsSync(statsFile)) {
            messageStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
        }
        const userStats = messageStats[userId] || { messages: 0, commands: 0 };

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
            inventory: userInventory
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
        
        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        let userRoles = [];
        if (guild) {
            try {
                const member = await guild.members.fetch(req.user.id);
                userRoles = member.roles.cache.map(r => r.id);
            } catch (e) {}
        }
        
        res.render('shop', {
            user: req.user,
            items: shop.items || [],
            roles: shop.roles || [],
            balance: balance || 0,
            userRoles: userRoles
        });
    } catch (error) {
        console.error('Ошибка загрузки магазина:', error);
        res.status(500).send('Ошибка загрузки магазина');
    }
});

router.get('/youtube', isAuthenticated, (req, res) => {
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) {
        youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    }
    res.render('youtube', { user: req.user, channels: youtubeData.channels });
});

router.get('/referrals', isAuthenticated, (req, res) => {
    const referrals = loadReferrals();
    const userRef = referrals[req.user.id] || { code: null, invited: [], bonus: 0 };
    
    if (!userRef.code) {
        userRef.code = generateCode();
        referrals[req.user.id] = userRef;
        saveReferrals(referrals);
    }
    
    const inviteLink = `${req.protocol}://${req.get('host')}/invite/${userRef.code}`;
    
    res.render('referrals', {
        user: req.user,
        refCode: userRef.code,
        inviteLink: inviteLink,
        invited: userRef.invited || [],
        bonus: userRef.bonus || 0,
        reward: userRef.bonus || 0
    });
});

router.get('/invite/:code', async (req, res) => {
    const code = req.params.code;
    const referrals = loadReferrals();
    
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
    
    req.session.referrerId = referrerId;
    
    res.render('invite', {
        user: req.user,
        referrerId: referrerId,
        code: code
    });
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

router.get('/admin/all-users', isAdmin, async (req, res) => {
    try {
        const guildId = '1208677626961727528';
        const members = await getCachedMembers(guildId);
        res.render('admin/all-users', { user: req.user, members });
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        res.status(500).send('Ошибка загрузки участников');
    }
});

router.get('/admin/youtube', isAdmin, (req, res) => {
    const youtubeFile = path.join(__dirname, '..', 'data', 'youtube.json');
    let youtubeData = { channels: [] };
    if (fs.existsSync(youtubeFile)) {
        youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    }
    res.render('admin/youtube', { user: req.user, channels: youtubeData.channels });
});

router.get('/admin/settings', isAdmin, (req, res) => {
    const config = configManager.getConfig();
    res.render('admin/settings', { user: req.user, config });
});

router.get('/admin/moderation', isAdmin, (req, res) => {
    res.render('admin/moderation', { user: req.user });
});

router.get('/admin/roles', isAdmin, (req, res) => {
    const data = loadSiteRoles();
    res.render('admin/roles', {
        user: req.user,
        roles: data.roles,
        users: data.users
    });
});

router.get('/admin/create-role', isAdmin, (req, res) => {
    res.render('admin/create-role', { user: req.user });
});

router.get('/admin/logs', isAdmin, (req, res) => {
    const logsFile = path.join(__dirname, '..', 'data', 'logs.json');
    let logs = [];
    if (fs.existsSync(logsFile)) {
        logs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
    }
    res.render('admin/logs', { user: req.user, logs });
});

router.get('/warnings', isAdmin, (req, res) => {
    const warningsFile = path.join(__dirname, '..', 'data', 'warnings.json');
    let warnings = { guilds: {} };
    if (fs.existsSync(warningsFile)) {
        warnings = JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
    }
    res.render('warnings', { user: req.user, warnings });
});

// ============= ЗАГРУЗКА МУЗЫКИ =============
router.get('/upload-music', isAuthenticated, (req, res) => {
    res.render('upload-music', { user: req.user });
});

router.post('/api/upload-music', isAuthenticated, upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.json({ success: false, error: 'Файл не загружен' });
    }

    const track = {
        id: Date.now(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        uploadedAt: new Date().toISOString()
    };

    const userTracksFile = path.join(__dirname, '..', 'data', 'user-tracks.json');
    let data = {};
    if (fs.existsSync(userTracksFile)) {
        data = JSON.parse(fs.readFileSync(userTracksFile, 'utf8'));
    }
    if (!data[req.user.id]) data[req.user.id] = [];
    data[req.user.id].push(track);
    fs.writeFileSync(userTracksFile, JSON.stringify(data, null, 2));

    res.json({ success: true, message: `Файл "${req.file.originalname}" загружен!` });
});

router.get('/api/my-tracks', isAuthenticated, (req, res) => {
    const userTracksFile = path.join(__dirname, '..', 'data', 'user-tracks.json');
    let data = {};
    if (fs.existsSync(userTracksFile)) {
        data = JSON.parse(fs.readFileSync(userTracksFile, 'utf8'));
    }
    const tracks = data[req.user.id] || [];
    res.json({ tracks });
});

// ============= ПОЛУЧЕНИЕ РОЛЕЙ С DISCORD =============
router.get('/api/guild-roles', isAuthenticated, async (req, res) => {
    try {
        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        const roles = guild.roles.cache
            .filter(role => role.id !== guild.id)
            .map(role => ({
                id: role.id,
                name: role.name,
                color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5',
                position: role.position
            }))
            .sort((a, b) => b.position - a.position);

        res.json({ success: true, roles });
    } catch (error) {
        console.error('Ошибка получения ролей:', error);
        res.json({ success: false, error: 'Ошибка получения ролей' });
    }
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
    if (fs.existsSync(youtubeFile)) {
        youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    }
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
    if (fs.existsSync(youtubeFile)) {
        youtubeData = JSON.parse(fs.readFileSync(youtubeFile, 'utf8'));
    }
    youtubeData.channels = youtubeData.channels.filter(c => c.channelId !== channelId);
    fs.writeFileSync(youtubeFile, JSON.stringify(youtubeData, null, 2));
    res.redirect('/admin/youtube');
});

router.post('/api/shop/buy', isAuthenticated, (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.id;
    const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
    let shop = { items: [], roles: [] };
    if (fs.existsSync(shopFile)) {
        shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
    }
    const item = shop.items.find(i => i.id == itemId);
    if (!item) return res.redirect('/shop?error=Товар не найден');
    const balance = economyManager.getUserBalance(userId);
    if (balance < item.price) return res.redirect('/shop?error=Недостаточно средств');
    economyManager.addBalance(userId, -item.price);
    res.redirect('/shop?success=Покупка успешна');
});

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
        
        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
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
        
        if (member.roles.cache.has(roleId)) {
            return res.json({ success: false, error: 'У вас уже есть эта роль!' });
        }
        
        economyManager.addBalance(userId, -roleData.price);
        await member.roles.add(role);
        
        res.json({ success: true, message: `Вы купили роль ${role.name} за ${roleData.price} монет!` });
        
    } catch (error) {
        console.error('Ошибка покупки роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
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

router.post('/api/admin/create-role', isAdmin, async (req, res) => {
    try {
        const { name, color } = req.body;
        
        if (!name) {
            return res.json({ success: false, error: 'Укажите название роли' });
        }

        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        const role = await guild.roles.create({
            name: name,
            color: color || '#99aab5',
            reason: 'Создана через сайт',
            permissions: []
        });

        const shopFile = path.join(__dirname, '..', 'data', 'shop.json');
        let shop = { items: [], roles: [] };
        if (fs.existsSync(shopFile)) {
            shop = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
        }

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
            message: `Роль "${role.name}" создана и добавлена в магазин за 500 монет!`,
            roleId: role.id
        });

    } catch (error) {
        console.error('❌ Ошибка создания роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

router.post('/api/admin/mute', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, error: 'Не авторизован' });
    }
    
    if (!hasPermission(req.user.id, 'mute')) {
        return res.json({ success: false, error: 'У вас нет права на мут' });
    }
    
    try {
        const { userId, duration, reason } = req.body;
        
        if (!userId || !duration) {
            return res.json({ success: false, error: 'Укажите ID пользователя и длительность' });
        }

        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        if (!member.moderatable) {
            return res.json({ success: false, error: 'Бот не может замутить этого пользователя' });
        }

        const ms = require('ms');
        const durationMs = ms(duration);
        if (!durationMs) {
            return res.json({ success: false, error: 'Неверный формат времени' });
        }

        await member.timeout(durationMs, reason || 'Мут через сайт');
        res.json({ success: true, message: `Пользователь замучен на ${duration}` });

    } catch (error) {
        console.error('❌ Ошибка мута:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

router.post('/api/admin/ban', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, error: 'Не авторизован' });
    }
    
    if (!hasPermission(req.user.id, 'ban')) {
        return res.json({ success: false, error: 'У вас нет права на бан' });
    }
    
    try {
        const { userId, reason } = req.body;
        
        if (!userId) {
            return res.json({ success: false, error: 'Укажите ID пользователя' });
        }

        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        if (!member.bannable) {
            return res.json({ success: false, error: 'Бот не может забанить этого пользователя' });
        }

        await member.ban({ reason: reason || 'Бан через сайт' });
        res.json({ success: true, message: 'Пользователь забанен' });

    } catch (error) {
        console.error('❌ Ошибка бана:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

router.post('/api/admin/role', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.json({ success: false, error: 'Не авторизован' });
    }
    
    if (!hasPermission(req.user.id, 'roles')) {
        return res.json({ success: false, error: 'У вас нет права на выдачу ролей' });
    }
    
    try {
        const { userId, roleId, action } = req.body;
        
        if (!userId || !roleId) {
            return res.json({ success: false, error: 'Укажите ID пользователя и роль' });
        }

        const guildId = '1208677626961727528';
        const guild = global.discordClient?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        const role = await guild.roles.fetch(roleId);
        if (!role) {
            return res.json({ success: false, error: 'Роль не найдена' });
        }

        if (action === 'add') {
            await member.roles.add(role);
            res.json({ success: true, message: `Роль ${role.name} выдана` });
        } else {
            await member.roles.remove(role);
            res.json({ success: true, message: `Роль ${role.name} убрана` });
        }

    } catch (error) {
        console.error('❌ Ошибка выдачи роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

router.post('/api/referrals/claim', isAuthenticated, (req, res) => {
    const referrals = loadReferrals();
    const userRef = referrals[req.user.id];
    
    if (!userRef || !userRef.invited || userRef.invited.length === 0) {
        return res.json({ success: false, error: 'У вас нет приглашённых' });
    }
    
    const unclaimed = userRef.invited.filter(i => !i.claimed);
    if (unclaimed.length === 0) {
        return res.json({ success: false, error: 'Все бонусы уже получены' });
    }
    
    const bonusAmount = 500 * unclaimed.length;
    economyManager.addBalance(req.user.id, bonusAmount);
    
    userRef.invited.forEach(i => { i.claimed = true; });
    userRef.bonus = (userRef.bonus || 0) + bonusAmount;
    saveReferrals(referrals);
    
    res.json({ success: true, message: `Вы получили ${bonusAmount} монет за ${unclaimed.length} приглашений!` });
});

router.post('/api/referrals/confirm', isAuthenticated, (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;
    const referrals = loadReferrals();
    
    let referrerId = null;
    for (const [id, data] of Object.entries(referrals)) {
        if (data.code === code) {
            referrerId = id;
            break;
        }
    }
    
    if (!referrerId) {
        return res.json({ success: false, error: 'Неверный код приглашения' });
    }
    
    if (referrerId === userId) {
        return res.json({ success: false, error: 'Нельзя пригласить самого себя!' });
    }
    
    const referrerData = referrals[referrerId];
    if (referrerData.invited && referrerData.invited.find(i => i.id === userId)) {
        return res.json({ success: false, error: 'Вы уже были приглашены этим пользователем' });
    }
    
    if (!referrerData.invited) referrerData.invited = [];
    referrerData.invited.push({
        id: userId,
        username: req.user.username,
        claimed: false,
        joined: false,
        invitedAt: new Date().toISOString()
    });
    
    saveReferrals(referrals);
    
    res.json({
        success: true,
        message: `✅ Приглашение подтверждено!`
    });
});

router.post('/api/warnings/clear', isAdmin, (req, res) => {
    const { userId, guildId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Укажите userId' });
    
    const warningsFile = path.join(__dirname, '..', 'data', 'warnings.json');
    let warnings = { guilds: {} };
    if (fs.existsSync(warningsFile)) {
        warnings = JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
    }
    
    if (warnings.guilds && warnings.guilds[guildId] && warnings.guilds[guildId].users) {
        delete warnings.guilds[guildId].users[userId];
        fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));
    }
    
    res.json({ success: true, message: 'Варны очищены' });
});
// ============= СМЕНА РОЛИ В DISCORD =============
router.post('/api/admin/set-role', isAdmin, async (req, res) => {
    try {
        const { userId, roleId } = req.body;
        const guildId = '1208677626961727528';
        
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.json({ success: false, error: 'Сервер не найден' });
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            return res.json({ success: false, error: 'Пользователь не найден' });
        }

        // УДАЛЯЕМ ТОЛЬКО ВЫБРАННУЮ РОЛЬ, ЕСЛИ ОНА ЕСТЬ
        if (roleId === 'none') {
            // Если выбрано "Без роли" — убираем все роли, кроме @everyone
            const rolesToRemove = member.roles.cache.filter(r => r.id !== guildId);
            await member.roles.remove(rolesToRemove);
            return res.json({ success: true, message: 'Все роли убраны!' });
        }

        const role = await guild.roles.fetch(roleId);
        if (!role) {
            return res.json({ success: false, error: 'Роль не найдена' });
        }

        // ПРОВЕРЯЕМ, ЕСТЬ ЛИ РОЛЬ
        if (member.roles.cache.has(roleId)) {
            // Если есть — убираем
            await member.roles.remove(role);
            return res.json({ success: true, message: `Роль "${role.name}" убрана!` });
        } else {
            // Если нет — добавляем
            await member.roles.add(role);
            return res.json({ success: true, message: `Роль "${role.name}" выдана!` });
        }

    } catch (error) {
        console.error('Ошибка смены роли:', error);
        res.json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});
// ============= ПОИСК ПОЛЬЗОВАТЕЛЕЙ (с кешем) =============
let usersCache = {
    data: null,
    timestamp: 0,
    ttl: 60000 // 1 минута
};

router.get('/api/users/search', isAuthenticated, async (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    
    try {
        const guildId = '1208677626961727528';
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) return res.json({ users: [] });
        
        // Используем кеш, чтобы не дёргать Discord каждый раз
        const now = Date.now();
        if (!usersCache.data || (now - usersCache.timestamp) > usersCache.ttl) {
            await guild.members.fetch();
            usersCache.data = guild.members.cache.map(m => ({
                id: m.id,
                username: m.user.username,
                avatar: m.user.displayAvatarURL()
            }));
            usersCache.timestamp = now;
        }
        
        const members = usersCache.data
            .filter(m => m.username.toLowerCase().includes(query) || m.id.includes(query))
            .slice(0, 20);
        
        res.json({ users: members });
    } catch (error) {
        console.error('Ошибка поиска:', error);
        res.json({ users: [] });
    }
});
// ============= СТРАНИЦА МОДЕРАЦИИ (для модераторов) =============
router.get('/moderation', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    
    // Проверяем, есть ли право на мут или бан
    if (!hasPermission(req.user.id, 'mute') && !hasPermission(req.user.id, 'ban')) {
        return res.redirect('/');
    }
    
    try {
        const guildId = '1208677626961727528';
        const guild = global.discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).send('Сервер не найден');
        }
        
        await guild.members.fetch();
        const members = guild.members.cache.map(m => ({
            id: m.id,
            username: m.user.username,
            avatar: m.user.displayAvatarURL(),
            joinedAt: m.joinedAt
        }));
        
        res.render('moderation', { 
            user: req.user, 
            members: members,
            canMute: hasPermission(req.user.id, 'mute'),
            canBan: hasPermission(req.user.id, 'ban')
        });
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
        res.status(500).send('Ошибка загрузки участников');
    }
});
module.exports = router;
