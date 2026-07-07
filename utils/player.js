const { Player } = require('discord-player');
const { Extractor } = require('@discord-player/extractor');

const player = new Player();

// Загружаем экстракторы для YouTube и локальных файлов
player.extractors.loadDefault();

module.exports = player;
