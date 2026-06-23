const Parser = require('rss-parser');
const parser = new Parser();
const fs = require('fs');
const path = require('path');

const TRACK_FILE = path.join(__dirname, '..', 'data', 'telegram_simple.json');

function loadTracking() {
    if (!fs.existsSync(TRACK_FILE)) {
        fs.writeFileSync(TRACK_FILE, JSON.stringify({ channels: [] }));
        return { channels: [] };
    }
    return JSON.parse(fs.readFileSync(TRACK_FILE, 'utf8'));
}

function saveTracking(data) {
    fs.writeFileSync(TRACK_FILE, JSON.stringify(data, null, 2));
}

async function checkTelegram(discordClient) {
    const data = loadTracking();
    
    for (const channel of data.channels) {
        try {
            // Используем альтернативный сервер
            const rssUrl = `https://tg.i-c-a.su/rss/${channel.username}`;
            const feed = await parser.parseURL(rssUrl);
            
            if (feed.items.length === 0) continue;
            
            const latestPost = feed.items[0];
            const postId = latestPost.link.split('/').pop();
            
            if (channel.lastPostId !== postId) {
                const discordChannel = discordClient.channels.cache.get(channel.discordChannelId);
                if (discordChannel) {
                    const postDate = new Date(latestPost.isoDate).toLocaleString('ru-RU');
                    const postText = latestPost.contentSnippet || latestPost.content || '(Нет текста)';
                    const truncatedText = postText.length > 500 ? postText.substring(0, 500) + '...' : postText;
                    
                    await discordChannel.send({
                        content: `📢 **Новое сообщение в Telegram!**\n📱 Канал: **@${channel.username}**\n🕐 ${postDate}\n\n${truncatedText}\n\n🔗 [Читать в Telegram](${latestPost.link})`
                    });
                    
                    channel.lastPostId = postId;
                    saveTracking(data);
                }
            }
        } catch (err) {
            console.error(`Ошибка проверки @${channel.username}:`, err.message);
        }
    }
}

module.exports = { checkTelegram };