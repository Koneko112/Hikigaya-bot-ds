const { google } = require('googleapis');
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

async function checkYouTubeChannels(client) {
    const data = loadYoutube();
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
        console.log('⚠️ YOUTUBE_API_KEY не задан в .env');
        return;
    }
    
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    
    for (const channel of data.channels) {
        try {
            const res = await youtube.search.list({
                part: 'snippet',
                channelId: channel.channelId,
                order: 'date',
                maxResults: 1,
                type: 'video'
            });
            
            const latestVideo = res.data.items[0];
            if (!latestVideo) continue;
            
            const videoId = latestVideo.id.videoId;
            
            if (channel.lastVideoId !== videoId) {
                const discordChannel = client.channels.cache.get(channel.discordChannelId);
                if (discordChannel) {
                    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    discordChannel.send({
                        content: `📺 **НОВОЕ ВИДЕО!**\n${channel.channelName}\n${videoUrl}`
                    });
                    
                    channel.lastVideoId = videoId;
                    channel.lastCheck = Date.now();
                    saveYoutube(data);
                }
            }
        } catch (error) {
            console.error(`Ошибка YouTube ${channel.channelName}:`, error.message);
        }
    }
}

module.exports = { checkYouTubeChannels, loadYoutube, saveYoutube };