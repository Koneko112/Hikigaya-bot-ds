const { Player } = require('discord-player');
const { Extractor } = require('@discord-player/extractor');

// Создаём плеер
const player = new Player();

// Загружаем экстракторы (YouTube, SoundCloud, Spotify)
player.extractors.loadDefault();

module.exports = player;
