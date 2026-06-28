const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const queue = new Map();

module.exports = {
    name: 'play',
    description: '🎵 Включить музыку',
    options: [
        {
            name: 'song',
            description: 'Название или ссылка',
            type: 3,
            required: true
        }
    ],

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ Зайди в голосовой канал!', ephemeral: true });
        }

        const query = interaction.options.getString('song');
        await interaction.deferReply();

        try {
            let songInfo;
            let url;

            if (ytdl.validateURL(query)) {
                url = query;
                songInfo = await ytdl.getInfo(url);
            } else {
                const result = await ytSearch(query);
                if (!result.videos.length) {
                    return interaction.editReply('❌ Ничего не найдено');
                }
                const video = result.videos[0];
                url = video.url;
                songInfo = await ytdl.getInfo(url);
            }

            const song = {
                title: songInfo.videoDetails.title,
                url: url,
                duration: songInfo.videoDetails.lengthSeconds,
                requestedBy: interaction.user.tag
            };

            let serverQueue = queue.get(interaction.guildId);

            if (!serverQueue) {
                serverQueue = { songs: [], player: null, connection: null };
                queue.set(interaction.guildId, serverQueue);
                serverQueue.songs.push(song);

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);
                serverQueue.connection = connection;
                serverQueue.player = player;

                play(interaction.guildId);

                return interaction.editReply(`🎵 **Играет:** ${song.title}`);
            } else {
                serverQueue.songs.push(song);
                return interaction.editReply(`📋 **Добавлено в очередь:** ${song.title} (позиция ${serverQueue.songs.length})`);
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply('❌ Ошибка при воспроизведении');
        }
    }
};

async function play(guildId) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length) {
        queue.delete(guildId);
        return;
    }

    const song = serverQueue.songs[0];
    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    serverQueue.player.play(resource);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        play(guildId);
    });

    serverQueue.player.on('error', (error) => {
        console.error('Ошибка плеера:', error);
        serverQueue.songs.shift();
        play(guildId);
    });
}