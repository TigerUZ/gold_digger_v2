// Пути к фоновым картинкам.
// После замены файлов увеличьте CACHE_VERSION и выполните: npm run build
const CACHE_VERSION = "10";

function bg(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const BACKGROUNDS = {
  start: bg("/img/start/background.png"),
  arcade: bg("/img/arcade/background.png"),
  game: bg("/img/game/game_background.png"),
  mines: bg("/img/mines/background.png"),
  earnings: bg("/img/game/game_background.png"),
  friends: bg("/img/game/game_background.png"),
  wallet: bg("/img/game/game_background.png"),
};
