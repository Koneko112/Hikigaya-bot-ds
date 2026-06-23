module.exports = {
    name: 'role',
    description: 'Выдать или убрать роль',
    async execute(message, args) {
        // Проверка прав
        if (!message.member.permissions.has('ManageRoles')) {
            return message.reply('❌ У вас нет права "Управление ролями"');
        }

        // Проверка аргументов
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('❌ Использование: !role @пользователь @роль add/remove');
        }

        const role = message.mentions.roles.first();
        if (!role) {
            return message.reply('❌ Упомяните роль');
        }

        const action = args[2]?.toLowerCase();
        if (!action || !['add', 'remove'].includes(action)) {
            return message.reply('❌ Укажите действие: add или remove');
        }

        const targetMember = await message.guild.members.fetch(targetUser.id);

        // Проверка, что роль можно изменить
        if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply('❌ Вы не можете изменить роли этому пользователю');
        }

        if (action === 'add') {
            await targetMember.roles.add(role);
            message.reply(`✅ Роль ${role} выдана ${targetUser}`);
        } else {
            await targetMember.roles.remove(role);
            message.reply(`✅ Роль ${role} убрана у ${targetUser}`);
        }
    }
};