const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const queue = new Map();

async function playSong(interaction, serverQueue, voiceChannel) {
    if (!serverQueue.songs.length) {
        queue.delete(interaction.guildId);
        return;
    }

    const song = serverQueue.songs[0];
    
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    
    const stream = ytdl(song.url, { 
        filter: 'audioonly',
        quality: 'lowestaudio',
        highWaterMark: 1 << 25
    });
    
    const resource = createAudioResource(stream);
    player.play(resource);
    connection.subscribe(player);

    serverQueue.player = player;
    serverQueue.connection = connection;

    player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        playSong(interaction, serverQueue, voiceChannel);
    });

    player.on('error', (error) => {
        console.error('Ошибка плеера:', error);
        serverQueue.songs.shift();
        playSong(interaction, serverQueue, voiceChannel);
    });
}

module.exports = { playSong, queue };