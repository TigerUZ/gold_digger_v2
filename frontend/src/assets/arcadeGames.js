const CACHE_VERSION = "1";

function icon(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const ARCADE_GAMES = [
  {
    id: "mole",
    title: "Крот",
    icon: icon("/img/arcade/icon-mole.png"),
    path: "/mole",
    soon: false,
  },
  {
    id: "catch",
    title: "Поймай золото",
    icon: icon("/img/arcade/icon-catch.png"),
    path: null,
    soon: true,
  },
  {
    id: "mines",
    title: "Сокровища",
    icon: icon("/img/arcade/icon-mines.png"),
    path: "/mines",
    soon: false,
  },
];
