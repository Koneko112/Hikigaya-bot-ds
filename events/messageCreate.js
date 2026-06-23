const profileCommand = require('../commands/profile');

module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        if (message.author.bot) return;
        
        // Обновляем счётчик сообщений
        profileCommand.updateMessageCount(message.author.id);
        
        const prefix = '!';
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = client.commands.get(commandName);
        if (!command) return;
        
        try {
            command.execute(message, args, client);
        } catch (error) {
            console.error(`Ошибка в команде ${commandName}:`, error);
            message.reply('❌ Произошла ошибка при выполнении команды.');
        }
    }
};