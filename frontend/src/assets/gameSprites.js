// Спрайты игрового поля. После замены файлов увеличьте CACHE_VERSION.
const CACHE_VERSION = "23";

function sprite(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const GAME_SPRITES = {
  grass: sprite("/img/game/grass-tile.png"),
  holeBack: sprite("/img/game/hole-back.png"),
  holeFrontTop: sprite("/img/game/hole-front-top.png"),
  holeFrontRim: sprite("/img/game/hole-front-rim.png"),
  mole: sprite("/img/game/mole-idle.png"),
  coin: sprite("/img/game/coin-hit.png"),
};
