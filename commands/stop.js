const { queue } = require('./play');

module.exports = {
    name: 'stop',
    description: '⏹ Остановить музыку',
    async execute(message) {
        const serverQueue = queue.get(message.guildId);
        if (!serverQueue) {
            return message.reply('❌ Ничего не играет');
        }
        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        queue.delete(message.guildId);
        return message.reply('⏹ **Музыка остановлена**');
    }
};