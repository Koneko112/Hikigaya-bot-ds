const Parser = require('rss-parser');
const parser = new Parser();
const fs = require('fs');
const path = require('path');

const TRACK_FILE = path.join(__dirname, '..', 'data', 'telegram_rss.json');

function loadTracking() {
    if (!fs.existsSync(TRACK_FILE)) return { channels: [] };
    return JSON.parse(fs.readFileSync(TRACK_FILE, 'utf8'));
}

function saveTracking(data) {
    fs.writeFileSync(TRACK_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'tg-track',
    description: 'Отслеживать Telegram канал (через RSS)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Требуются права администратора');
        }

        const channelUsername = args[0]?.replace('@', '');
        const discordChannel = message.mentions.channels.first() || message.channel;

        if (!channelUsername) {
            return message.reply('❌ Использование: !tg-track @канал_телеграм #канал_дискорд');
        }

        // Используем RSSWorker (бесплатный публичный сервис)
        const rssUrl = `https://rsshub.app/telegram/channel/${channelUsername}`;
        
        // Проверяем, работает ли канал
        try {
            await parser.parseURL(rssUrl);
        } catch (err) {
            return message.reply(`❌ Канал @${channelUsername} не найден или RSS недоступен`);
        }

        const tracking = loadTracking();
        tracking.channels.push({
            username: channelUsername,
            discordChannelId: discordChannel.id,
            rssUrl: rssUrl,
            lastPostId: null
        });
        saveTracking(tracking);

        message.reply(`✅ Отслеживаю Telegram канал **@${channelUsername}**\n📍 Уведомления → ${discordChannel}`);
    }
};