const { queue } = require('./play');

module.exports = {
    name: 'skip',
    description: '⏭ Пропустить трек',
    async execute(message) {
        const serverQueue = queue.get(message.guildId);
        if (!serverQueue || !serverQueue.songs.length) {
            return message.reply('❌ Ничего не играет');
        }
        serverQueue.player.stop();
        return message.reply('⏭ **Трек пропущен**');
    }
};
