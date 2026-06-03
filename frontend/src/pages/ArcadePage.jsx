import "./ArcadePage.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import PageBackground from "../components/PageBackground.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";
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
    <PageBackground image={BACKGROUNDS.arcade} className="arcade-page" overlay={false}>
      <ul className="arcade-slots" aria-label="Выбор игры">
        {ARCADE_GAMES.map((game) => (
          <li key={game.id} className="arcade-slots__item">
            <button
              type="button"
              className={"arcade-slot" + (game.soon ? " arcade-slot--soon" : "")}
              onClick={() => onGameClick(game)}
              aria-label={game.title}
            >
              <img className="arcade-slot__icon" src={game.icon} alt="" />
              <span className="arcade-slot__title">{game.title}</span>
              {game.soon ? <span className="arcade-slot__badge">Скоро</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="arcade-back-btn" onClick={() => navigate("/")}>
        Назад
      </button>
    </PageBackground>
  );
}
