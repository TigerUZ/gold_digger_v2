// Пути к фоновым картинкам.
// После замены файлов увеличьте CACHE_VERSION и выполните: npm run build
const CACHE_VERSION = "9";

function bg(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const BACKGROUNDS = {
  start: bg("/img/start/background.png"),
  game: bg("/img/game/game_background.png"),
  earnings: bg("/img/game/game_background.png"),
  friends: bg("/img/game/game_background.png"),
  wallet: bg("/img/game/game_background.png"),
};
