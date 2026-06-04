import "./ArcadePage.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import PageBackground from "../components/PageBackground.jsx";
import { ARCADE_BG } from "../assets/arcadeAssets.js";
import { ARCADE_GAMES } from "../assets/arcadeGames.js";
import { audio } from "../utils/audioManager.js";

function showSoonAlert() {
  try {
    window.Telegram?.WebApp?.showAlert?.("Скоро будет!");
  } catch {
    // ignore
  }
}

export default function ArcadePage() {
  const navigate = useNavigate();

  const onGameClick = (game) => {
    audio.unlock();
    if (game.soon || !game.path) {
      showSoonAlert();
      return;
    }
    navigate(game.path);
  };

  return (
    <PageBackground image={ARCADE_BG} className="arcade-page" overlay={false}>
      <h1 className="arcade-page__title">Выберите игру</h1>
      <ul className="arcade-menu" aria-label="Выбор игры">
        {ARCADE_GAMES.map((game) => (
          <li key={game.id} className="arcade-menu__item">
            <button
              type="button"
              className={"arcade-menu__btn" + (game.soon ? " arcade-menu__btn--soon" : "")}
              onClick={() => onGameClick(game)}
              aria-label={game.title}
            >
              <img className="arcade-menu__card" src={game.card} alt="" />
              <span className="arcade-menu__title">{game.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </PageBackground>
  );
}
