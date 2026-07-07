const player = require('../utils/player');
const { QueryType } = require('discord-player');

module.exports = {
    name: 'play-uploaded',
    description: '🎵 Включить загруженный трек',
    async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ Зайди в голосовой канал!');
        }

        const userTracksFile = require('path').join(__dirname, '..', 'data', 'user-tracks.json');
        let data = {};
        if (require('fs').existsSync(userTracksFile)) {
            data = JSON.parse(require('fs').readFileSync(userTracksFile, 'utf8'));
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

        if (!require('fs').existsSync(targetTrack.path)) {
            return message.reply(`❌ Файл "${targetTrack.originalName}" не найден на сервере. Загрузи его заново.`);
        }

        try {
            const queue = await player.nodes.create(message.guild, {
                metadata: {
                    channel: message.channel
                }
            });

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            // Добавляем локальный файл
            const result = await player.search(targetTrack.path, {
                requestedBy: message.author
            });

            if (!result.tracks.length) {
                return message.reply('❌ Не удалось воспроизвести файл');
            }

            const track = result.tracks[0];
            queue.addTrack(track);

            if (!queue.node.isPlaying()) {
                await queue.node.play();
                return message.reply(`🎵 **Играет:** ${targetTrack.originalName}`);
            } else {
                return message.reply(`📋 **Добавлено в очередь:** ${targetTrack.originalName} (позиция ${queue.tracks.data.length})`);
            }

        } catch (error) {
            console.error('❌ Ошибка воспроизведения:', error);
            return message.reply('❌ Ошибка при воспроизведении: ' + error.message);
        }
    }
};
