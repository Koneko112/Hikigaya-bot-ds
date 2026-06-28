const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');

const queue = new Map();

module.exports = {
    name: 'play',
    description: '🎵 Включить музыку',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Зайди в голосовой канал!');
        }

        if (!args.length) {
            return message.reply('❌ Укажи название песни или ссылку: `!play Imagine Dragons`');
        }

        const query = args.join(' ');

        try {
            let songInfo;
            let url;

            if (ytdl.validateURL(query)) {
                url = query;
                songInfo = await ytdl.getInfo(url);
            } else {
                const result = await ytSearch(query);
                if (!result.videos.length) {
                    return message.reply('❌ Ничего не найдено');
                }
                const video = result.videos[0];
                url = video.url;
                songInfo = await ytdl.getInfo(url);
            }

            const song = {
                title: songInfo.videoDetails.title,
                url: url,
                duration: songInfo.videoDetails.lengthSeconds,
                requestedBy: message.author.tag
            };

            let serverQueue = queue.get(message.guildId);

            if (!serverQueue) {
                serverQueue = { songs: [], player: null, connection: null };
                queue.set(message.guildId, serverQueue);
                serverQueue.songs.push(song);

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guildId,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);
                serverQueue.connection = connection;
                serverQueue.player = player;

                play(message.guildId);

                return message.reply(`🎵 **Играет:** ${song.title}`);
            } else {
                serverQueue.songs.push(song);
                return message.reply(`📋 **Добавлено в очередь:** ${song.title} (позиция ${serverQueue.songs.length})`);
            }

        } catch (error) {
            console.error(error);
            return message.reply('❌ Ошибка при воспроизведении');
        }
    }
};

async function play(guildId) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length) {
        queue.delete(guildId);
        return;
    }

    const song = serverQueue.songs[0];
    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    serverQueue.player.play(resource);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        play(guildId);
    });

    serverQueue.player.on('error', (error) => {
        console.error('Ошибка плеера:', error);
        serverQueue.songs.shift();
        play(guildId);
    });
}
