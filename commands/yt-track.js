const { loadYoutube, saveYoutube } = require('../utils/youtubeRSS');

module.exports = {
    name: 'yt-track',
    description: 'Отслеживать YouTube канал (без API ключа!)',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Требуются права администратора');
        }
        
        const channelId = args[0];
        const channelName = args.slice(1).join(' ');
        
        if (!channelId || !channelName) {
            return message.reply('❌ Использование: !yt-track CHANNEL_ID Название канала\n\nКак найти CHANNEL_ID:\n1. Зайдите на канал YouTube\n2. В URL смотрите: youtube.com/channel/ **ВОТ_ЭТО_ID** \nИли: youtube.com/@username → клик правой кнопкой → скопировать ID канала');
        }
        
        // Проверяем, существует ли канал
        try {
            const Parser = require('rss-parser');
            const parser = new Parser();
            const testUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            await parser.parseURL(testUrl);
        } catch (error) {
            return message.reply(`❌ Канал с ID \`${channelId}\` не найден! Проверьте ID канала.`);
        }
        
        const data = loadYoutube();
        
        if (data.channels.find(c => c.channelId === channelId)) {
            return message.reply('❌ Этот канал уже отслеживается');
        }
        
        data.channels.push({
            channelId,
            channelName,
            discordChannelId: message.channel.id,
            lastVideoId: null,
            lastCheck: null
        });
        
        saveYoutube(data);
        message.reply(`✅ Теперь отслеживаю канал **${channelName}**\n📺 Channel ID: ${channelId}\n📍 Уведомления будут в этом канале!`);
    }
};