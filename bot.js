console.log('🚀 Бот пытается запуститься...');
const express = require('express');
const session = require('express-session'); 
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;
console.log('📦 FFmpeg path:', ffmpeg);
console.log('✅ Плеер инициализирован');

// ====== ИНИЦИАЛИЗАЦИЯ БОТА ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates 
    ]
});
global.discordClient = client;

client.commands = new Collection();

// ====== ЗАГРУЗКА КОМАНД ======
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// ====== ЗАГРУЗКА СОБЫТИЙ ======
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// ====== ВЕБ-СЕРВЕР ======
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'dashboard', 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ====== СЕССИЯ ======
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

// ====== PASSPORT ======
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: '1506710063446757477',
    clientSecret: 'sCbw-6Q_Drg3BhcdZuiYV4yQ9ugElO3h',
    callbackURL: 'https://hikigaya-bot-ds.onrender.com/auth/discord/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// ====== МАРШРУТЫ ======
const routes = require('./dashboard/routes');
app.use('/', routes);

// ====== ЗАПУСК ======
const PORT = process.env.PORT || 3000;

const { checkYouTubeRSS } = require('./utils/youtubeRSS');
const { checkTelegram } = require('./utils/simpleTelegram');

// Функция для получения локального IP
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Запускаем веб-сервер СРАЗУ
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Панель запущена → http://localhost:${PORT}`);
    console.log(`📱 Доступно для друзей → http://${getLocalIP()}:${PORT}`);
});

// ===== АВТОМАТИЧЕСКОЕ СНЯТИЕ ПЛАТНЫХ РОЛЕЙ =====
const paidRolesFile = path.join(__dirname, 'data', 'paid-roles.json');

// Запускаем проверку раз в минуту
setInterval(() => {
    if (!fs.existsSync(paidRolesFile)) return;

    try {
        const data = JSON.parse(fs.readFileSync(paidRolesFile, 'utf8'));
        const now = new Date();

        for (const [userId, purchase] of Object.entries(data.purchases || {})) {
            if (new Date(purchase.expiresAt) < now) {
                // Снимаем роль
                const guild = client.guilds.cache.get('1208677626961727528');
                if (guild) {
                    const member = guild.members.cache.get(userId);
                    if (member) {
                        const role = guild.roles.cache.get(purchase.roleId);
                        if (role) {
                            member.roles.remove(role);
                            // Удаляем роль с сервера
                            role.delete();
                            console.log(`🔴 Снята и удалена роль у ${member.user.tag}`);
                        }
                    }
                }
                delete data.purchases[userId];
                fs.writeFileSync(paidRolesFile, JSON.stringify(data, null, 2));
            }
        }
    } catch (error) {
        console.error('❌ Ошибка проверки ролей:', error);
    }
}, 60000); // 1 минута

// А бота подключаем отдельно
client.login(process.env.TOKEN);
console.log('📡 Отправлен запрос на вход в Discord...');

client.once('clientReady', () => {
    console.log(`✅ Бот запущен как ${client.user.tag}`);
    console.log(`📊 Серверов: ${client.guilds.cache.size}`);
    
    // YouTube отслеживание (каждые 5 минут)
    setInterval(() => {
        checkYouTubeRSS(client);
    }, 300000);

    // Telegram отслеживание (каждую минуту)
    setInterval(() => {
        checkTelegram(client);
    }, 60000);
});
