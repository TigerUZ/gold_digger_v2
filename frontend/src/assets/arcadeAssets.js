const CACHE_VERSION = "6";

function asset(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const ARCADE_BG = asset("/img/arcade/background.png");
