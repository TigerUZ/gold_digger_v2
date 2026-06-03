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
      <div className="arcade-page__inner">
        <h1 className="arcade-page__title">Выберите игру</h1>
        <ul className="arcade-games">
          {ARCADE_GAMES.map((game) => (
            <li key={game.id}>
              <button
                type="button"
                className={"arcade-game-card" + (game.soon ? " arcade-game-card--soon" : "")}
                onClick={() => onGameClick(game)}
              >
                <img className="arcade-game-card__icon" src={game.icon} alt="" />
                <span className="arcade-game-card__title">{game.title}</span>
                {game.soon ? <span className="arcade-game-card__badge">Скоро</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="arcade-back-btn" onClick={() => navigate("/")}>
          Назад
        </button>
      </div>
    </PageBackground>
  );
}
