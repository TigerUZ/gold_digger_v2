const CACHE_VERSION = "1";

function tile(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const MINE_TILES = {
  closed: tile("/img/mines/tile-closed.png"),
  empty: tile("/img/mines/tile-empty.png"),
  gold: tile("/img/mines/tile-gold.png"),
  mine: tile("/img/mines/tile-mine.png"),
};
