const express = require('express');
const session = require('express-session'); 
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

// ====== ИНИЦИАЛИЗАЦИЯ БОТА ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
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
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
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

// А бота подключаем отдельно
client.login(process.env.TOKEN);

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
