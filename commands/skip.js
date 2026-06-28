const player = require('../utils/player');

module.exports = {
    name: 'skip',
    description: '⏭ Пропустить трек',
    async execute(message) {
        const queue = player.nodes.get(message.guild);
        
        if (!queue || !queue.node.isPlaying()) {
            return message.reply('❌ Ничего не играет');
        }
        
        queue.node.skip();
        return message.reply('⏭ **Трек пропущен**');
    }
};
