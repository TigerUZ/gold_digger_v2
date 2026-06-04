const CACHE_VERSION = "6";

function card(path) {
  return `${path}?v=${CACHE_VERSION}`;
}

export const ARCADE_GAMES = [
  {
    id: "mole",
    title: "Крот",
    card: card("/img/arcade/icon-mole-card.png"),
    path: "/mole",
    soon: false,
  },
  {
    id: "mines",
    title: "Сокровища",
    card: card("/img/arcade/icon-mines-card.png"),
    path: "/mines",
    soon: false,
  },
  {
    id: "catch",
    title: "Золотой дождь",
    card: card("/img/arcade/icon-catch-card.png"),
    path: null,
    soon: true,
  },
];
