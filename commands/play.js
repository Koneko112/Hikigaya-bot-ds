const player = require('../utils/player');

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
            const queue = player.nodes.create(message.guild);

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            const result = await player.search(query, {
                requestedBy: message.author,
                searchEngine: 'youtube'
            });

            if (!result.tracks.length) {
                return message.reply('❌ Ничего не найдено');
            }

            const track = result.tracks[0];
            queue.addTrack(track);

            if (!queue.node.isPlaying()) {
                await queue.node.play();
                return message.reply(`🎵 **Играет:** ${track.title}`);
            } else {
                return message.reply(`📋 **Добавлено в очередь:** ${track.title} (позиция ${queue.tracks.data.length})`);
            }

        } catch (error) {
            console.error('Ошибка:', error);
            return message.reply('❌ Ошибка при воспроизведении. Попробуй другую песню.');
        }
    }
};
