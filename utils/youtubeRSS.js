const Parser = require('rss-parser');
const parser = new Parser();
const fs = require('fs');
const path = require('path');

const YOUTUBE_FILE = path.join(__dirname, '..', 'data', 'youtube.json');

function loadYoutube() {
    if (!fs.existsSync(YOUTUBE_FILE)) {
        fs.writeFileSync(YOUTUBE_FILE, JSON.stringify({ channels: [] }));
        return { channels: [] };
    }
    return JSON.parse(fs.readFileSync(YOUTUBE_FILE, 'utf8'));
}

function saveYoutube(data) {
    fs.writeFileSync(YOUTUBE_FILE, JSON.stringify(data, null, 2));
}

async function checkYouTubeRSS(client) {
    const data = loadYoutube();
    
    for (const channel of data.channels) {
        try {
            // RSS ссылка для YouTube канала (НЕ нужен API ключ!)
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
            const feed = await parser.parseURL(rssUrl);
            
            if (feed.items.length === 0) continue;
            
            const latestVideo = feed.items[0];
            const videoId = latestVideo.id.split(':').pop();
            
            if (channel.lastVideoId !== videoId) {
                const discordChannel = client.channels.cache.get(channel.discordChannelId);
                if (discordChannel) {
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const videoTitle = latestVideo.title;
                    
                    discordChannel.send({
                        content: `📺 **НОВОЕ ВИДЕО!**\n**${channel.channelName}**\n📹 ${videoTitle}\n🔗 ${videoUrl}`
                    });
                    
                    channel.lastVideoId = videoId;
                    channel.lastCheck = Date.now();
                    saveYoutube(data);
                }
            }
        } catch (error) {
            console.error(`Ошибка RSS ${channel.channelName}:`, error.message);
        }
    }
}

module.exports = { checkYouTubeRSS, loadYoutube, saveYoutube };