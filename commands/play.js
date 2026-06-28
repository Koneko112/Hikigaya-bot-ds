const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

// === ВСТАВЬ СВОИ COOKIE СЮДА ===
const YT_COOKIE = '__Secure-3PSID=g.a000_AjlniNGLNYgQ29mGdTUbsGEDCDXa8r99dOOkYTYcjcnpBestucv7Mits8cRRgd37VSAfAACgYKAX4SARQSFQHGX2MiEGeGh5MgwX-j2KbnRbUuGhoVAUF8yKoDSh9t30v1VTTQSac9zshc0076; __Secure-3PAPISID=I_FCLNnMccs64krT/AO2maUnNcCniNQoyi;';

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
            play.setToken({
                youtube: {
                    cookie: YT_COOKIE
                }
            });

            let video;
            if (play.yt_validate(query) === 'video') {
                video = await play.video_info(query);
            } else {
                const results = await play.search(query, { limit: 1 });
                if (!results.length) {
                    return message.reply('❌ Ничего не найдено');
                }
                video = await play.video_info(results[0].url);
            }

            const song = {
                title: video.video_details.title,
                url: video.video_details.url,
                duration: video.video_details.durationInSec,
                thumbnail: video.video_details.thumbnails[0]?.url,
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

                playSong(message.guildId);

                return message.reply(`🎵 **Играет:** ${song.title}`);
            } else {
                serverQueue.songs.push(song);
                return message.reply(`📋 **Добавлено в очередь:** ${song.title} (позиция ${serverQueue.songs.length})`);
            }

        } catch (error) {
            console.error('Ошибка:', error);
            return message.reply('❌ Ошибка при воспроизведении. Попробуй другую песню.');
        }
    }
};

async function playSong(guildId) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length) {
        queue.delete(guildId);
        return;
    }

    const song = serverQueue.songs[0];
    
    try {
        const stream = await play.stream(song.url, {
            quality: 0,
            discordPlayerCompatibility: true
        });

        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        serverQueue.player.play(resource);

        serverQueue.player.on(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(guildId);
        });

        serverQueue.player.on('error', (error) => {
            console.error('Ошибка плеера:', error);
            serverQueue.songs.shift();
            playSong(guildId);
        });

    } catch (error) {
        console.error('Ошибка воспроизведения:', error);
        serverQueue.songs.shift();
        playSong(guildId);
    }
}
