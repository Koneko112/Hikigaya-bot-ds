const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');

const queue = new Map();

module.exports = {
    name: 'play',
    description: '🎵 Включить музыку (SoundCloud)',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Зайди в голосовой канал!');
        }

        if (!args.length) {
            return message.reply('❌ Укажи название песни или ссылку: `!play Shadowraze`');
        }

        const query = args.join(' ');

        try {
            let song;
            let url;

            // === ПРОВЕРЯЕМ, ЭТО ССЫЛКА НА SOUNDCLOUD? ===
            if (play.sc_validate(query) === 'track') {
                const track = await play.sc_track_info(query);
                song = {
                    title: track.name,
                    url: track.url,
                    duration: track.durationInSec,
                    requestedBy: message.author.tag,
                    source: 'SoundCloud'
                };
            } else {
                // === ПОИСК НА SOUNDCLOUD ===
                const results = await play.search(query, {
                    limit: 1,
                    source: {
                        soundcloud: 'track'
                    }
                });

                if (!results.length) {
                    return message.reply('❌ Ничего не найдено на SoundCloud. Попробуй другое название.');
                }

                const track = results[0];
                song = {
                    title: track.name,
                    url: track.url,
                    duration: track.durationInSec,
                    requestedBy: message.author.tag,
                    source: 'SoundCloud'
                };
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

                return message.reply(`🎵 **Играет (SoundCloud):** ${song.title}`);
            } else {
                serverQueue.songs.push(song);
                return message.reply(`📋 **Добавлено в очередь (SoundCloud):** ${song.title} (позиция ${serverQueue.songs.length})`);
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
