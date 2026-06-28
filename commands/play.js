const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const queue = new Map();

module.exports = {
    name: 'play',
    description: '🎵 Включить музыку (SoundCloud/YouTube)',
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
            let song;
            let url;

            // === ПРОВЕРЯЕМ ССЫЛКУ ===
            if (play.yt_validate(query) === 'video') {
                // YouTube
                const video = await play.video_info(query);
                song = {
                    title: video.video_details.title,
                    url: video.video_details.url,
                    duration: video.video_details.durationInSec,
                    requestedBy: message.author.tag,
                    source: 'YouTube'
                };
            } else if (play.sc_validate(query) === 'track') {
                // SoundCloud
                const track = await play.sc_track_info(query);
                song = {
                    title: track.name,
                    url: track.url,
                    duration: track.durationInSec,
                    requestedBy: message.author.tag,
                    source: 'SoundCloud'
                };
            } else {
                // === ПОИСК ===
                // Сначала ищем на SoundCloud
                let scResults = await play.search(query, {
                    limit: 1,
                    source: {
                        soundcloud: 'track'
                    }
                });

                if (scResults.length) {
                    const track = scResults[0];
                    song = {
                        title: track.name,
                        url: track.url,
                        duration: track.durationInSec,
                        requestedBy: message.author.tag,
                        source: 'SoundCloud'
                    };
                } else {
                    // Если нет — ищем на YouTube
                    const ytResults = await play.search(query, { limit: 1 });
                    if (!ytResults.length) {
                        return message.reply('❌ Ничего не найдено');
                    }
                    const video = await play.video_info(ytResults[0].url);
                    song = {
                        title: video.video_details.title,
                        url: video.video_details.url,
                        duration: video.video_details.durationInSec,
                        requestedBy: message.author.tag,
                        source: 'YouTube'
                    };
                }
            }

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

                return message.reply(`🎵 **Играет (${song.source}):** ${song.title}`);
            } else {
                serverQueue.songs.push(song);
                return message.reply(`📋 **Добавлено в очередь (${song.source}):** ${song.title} (позиция ${serverQueue.songs.length})`);
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
        let stream;
        if (song.source === 'SoundCloud') {
            stream = await play.stream(song.url, {
                discordPlayerCompatibility: true
            });
        } else {
            stream = await play.stream(song.url, {
                quality: 0,
                discordPlayerCompatibility: true
            });
        }

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
