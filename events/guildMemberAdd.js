const configManager = require('../config/configManager');

module.exports = {
    name: 'guildMemberAdd',
    execute(member) {
        const config = configManager.getConfig();
        
        // Приветственное сообщение
        if (config.welcomeMessage) {
            const channel = member.guild.systemChannel;
            if (channel) {
                const message = config.welcomeMessage.replace('{user}', `<@${member.id}>`);
                channel.send(message);
            }
        }
        
        // Автороль
        if (config.autoRoleId) {
            const role = member.guild.roles.cache.get(config.autoRoleId);
            if (role) {
                member.roles.add(role).catch(console.error);
            }
        }
    }
};