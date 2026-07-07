const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

// Принудительно подключаем opusscript
require('opusscript');

const queue = new Map();

module.exports = {
    name: 'play-uploaded',
    description: '🎵 Включить загруженный трек',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Зайди в голосовой канал!');
        }

        const userTracksFile = path.join(__dirname, '..', 'data', 'user-tracks.json');
        let data = {};
        if (fs.existsSync(userTracksFile)) {
            data = JSON.parse(fs.readFileSync(userTracksFile, 'utf8'));
        }
        const tracks = data[message.author.id] || [];

        if (!tracks.length) {
            return message.reply('❌ У тебя нет загруженных треков. Загрузи их на сайте: /upload-music');
        }

        let targetTrack;
        if (args.length) {
            const query = args.join(' ').toLowerCase();
            targetTrack = tracks.find(t => t.originalName.toLowerCase().includes(query));
            if (!targetTrack) {
                return message.reply(`❌ Трек "${query}" не найден. Твои треки: ${tracks.map(t => t.originalName).join(', ')}`);
            }
        } else {
            targetTrack = tracks[tracks.length - 1];
        }

        if (!fs.existsSync(targetTrack.path)) {
            return message.reply(`❌ Файл "${targetTrack.originalName}" не найден на сервере. Загрузи его заново.`);
        }

        const song = {
            title: targetTrack.originalName,
            path: targetTrack.path,
            requestedBy: message.author.tag
        };

        console.log('📂 Путь к файлу:', song.path);
        console.log('📂 Файл существует?', fs.existsSync(song.path));

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
            return message.reply(`📋 **Добавлено в очередь:** ${song.title}`);
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
        console.log(`🎵 Воспроизвожу: ${song.path}`);

        const resource = createAudioResource(song.path, {
            inlineVolume: true
        });

        serverQueue.player.play(resource);

        serverQueue.player.on(AudioPlayerStatus.Idle, () => {
            console.log('⏭ Трек закончился, переключаем...');
            serverQueue.songs.shift();
            playSong(guildId);
        });

        serverQueue.player.on('error', (error) => {
            console.error('❌ Ошибка плеера:', error);
            serverQueue.songs.shift();
            playSong(guildId);
        });

    } catch (error) {
        console.error('❌ Ошибка воспроизведения:', error);
        serverQueue.songs.shift();
        playSong(guildId);
    }
}
