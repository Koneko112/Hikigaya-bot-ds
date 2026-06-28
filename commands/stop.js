const { queue } = require('./play');

module.exports = {
    name: 'stop',
    description: '⏹ Остановить музыку',
    async execute(interaction) {
        const serverQueue = queue.get(interaction.guildId);
        if (!serverQueue) {
            return interaction.reply('❌ Ничего не играет');
        }
        serverQueue.songs = [];
        serverQueue.player.stop();
        serverQueue.connection.destroy();
        queue.delete(interaction.guildId);
        return interaction.reply('⏹ **Музыка остановлена**');
    }
};