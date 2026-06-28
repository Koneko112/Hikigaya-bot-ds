const player = require('../utils/player');

module.exports = {
    name: 'stop',
    description: '⏹ Остановить музыку',
    async execute(message) {
        const queue = player.nodes.get(message.guild);
        
        if (!queue || !queue.node.isPlaying()) {
            return message.reply('❌ Ничего не играет');
        }
        
        queue.delete();
        return message.reply('⏹ **Музыка остановлена**');
    }
};
