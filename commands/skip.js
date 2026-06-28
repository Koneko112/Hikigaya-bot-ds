const { queue } = require('./play');

module.exports = {
    name: 'skip',
    description: '⏭ Пропустить трек',
    async execute(interaction) {
        const serverQueue = queue.get(interaction.guildId);
        if (!serverQueue || !serverQueue.songs.length) {
            return interaction.reply('❌ Ничего не играет');
        }
        serverQueue.player.stop();
        return interaction.reply('⏭ **Трек пропущен**');
    }
};