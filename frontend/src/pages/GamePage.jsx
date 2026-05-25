import "./GamePage.css";
import Header from "../components/Header.jsx";
import PageBackground from "../components/PageBackground.jsx";
import MoleField from "../components/MoleField.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";
import { audio } from "../utils/audioManager.js";
import React, { useEffect, useMemo, useRef, useState } from "react";

const ROUND_SECONDS = 60;
const MOLE_SHOW_MS = 1000;
const MOLE_SPAWN_MS = 1100;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function GamePage({ header_info, apiFetch, user, refreshUser, nextLifeIn }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [activeHole, setActiveHole] = useState(null);
  const [whackedHole, setWhackedHole] = useState(null);
  const [score, setScore] = useState(0);
  const [scoreBump, setScoreBump] = useState(false);
  const [message, setMessage] = useState("");

  const tickRef = useRef(null);
  const moleIntervalRef = useRef(null);
  const moleTimeoutRef = useRef(null);
  const scoreRef = useRef(0);
  const finishingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const activeHoleRef = useRef(null);

  const holes = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  const lives = user?.game_mechanic?.lives ?? 0;
  const noLives = !isPlaying && lives <= 0;

  useEffect(() => {
    return () => {
      clearInterval(tickRef.current);
      clearInterval(moleIntervalRef.current);
      clearTimeout(moleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    activeHoleRef.current = activeHole;
  }, [activeHole]);

  useEffect(() => {
    if (!audio.isUnlocked()) return undefined;
    if (isPlaying) {
      audio.playGameMusic();
    } else {
      audio.stopGameMusic();
      audio.playMenuMusic();
    }
    return () => {
      audio.stopGameMusic();
    };
  }, [isPlaying]);

  const stopGame = async (finalScore) => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    clearInterval(tickRef.current);
    clearInterval(moleIntervalRef.current);
    clearTimeout(moleTimeoutRef.current);
    activeHoleRef.current = null;
    setActiveHole(null);
    setIsPlaying(false);

    try {
      await apiFetch("/game/finish", {
        method: "POST",
        body: JSON.stringify({ score: finalScore }),
      });
      await refreshUser();
      setMessage(`Раунд завершён! Вы набрали ${finalScore} золота.`);
    } catch {
      setMessage("Не удалось сохранить результат. Попробуйте ещё раз.");
    } finally {
      finishingRef.current = false;
    }
  };

  const startGame = async () => {
    audio.unlock();
    setMessage("");
    finishingRef.current = false;

    try {
      await apiFetch("/game/start", { method: "POST" });
      await refreshUser();
    } catch (e) {
      const wait = e?.body?.next_life_in_seconds || e?.body?.detail?.next_life_in_seconds;
      if (e.status === 403 && wait) {
        const mins = Math.ceil(wait / 60);
        setMessage(`Жизни закончились. Следующая через ~${mins} мин.`);
      } else {
        setMessage("Не удалось начать игру. Откройте приложение через Telegram.");
      }
      return;
    }

    setIsPlaying(true);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(ROUND_SECONDS);

    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current);
          clearInterval(moleIntervalRef.current);
          stopGame(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const showMole = () => {
      const idx = Math.floor(Math.random() * 9);
      activeHoleRef.current = idx;
      setActiveHole(idx);
      clearTimeout(moleTimeoutRef.current);
      moleTimeoutRef.current = setTimeout(() => {
        activeHoleRef.current = null;
        setActiveHole(null);
      }, MOLE_SHOW_MS);
    };

    showMole();
    moleIntervalRef.current = setInterval(showMole, MOLE_SPAWN_MS);
  };

  const onHoleClick = (idx) => {
    if (!isPlayingRef.current) return;
    if (idx !== activeHoleRef.current) return;

    clearTimeout(moleTimeoutRef.current);
    activeHoleRef.current = null;
    setActiveHole(null);
    setScore((s) => s + 1);
    setScoreBump(true);
    setWhackedHole(idx);
    setTimeout(() => setScoreBump(false), 350);
    setTimeout(() => setWhackedHole(null), 520);
    audio.playWhack();
    audio.playCoin();
  };

  return (
    <PageBackground image={BACKGROUNDS.game} className="home_main_page" blur>
      <Header header_info={header_info} title="Home" />
      <div className="space-for-header" />

      <div className="game-ui">
        <div className="game-hud">
          <div className="game-stats">
            <div className="game-stat game-stat--time">
              <span className="label">Время</span>
              <span className="value">{formatTime(timeLeft)}</span>
            </div>
            <div className={"game-stat game-stat--score" + (scoreBump ? " is-bump" : "")}>
              <span className="label">Счёт</span>
              <span className="value">{score}</span>
            </div>
            <div className="game-stat">
              <span className="label">Жизни</span>
              <span className="value">{user?.game_mechanic?.lives ?? "-"}</span>
            </div>
          </div>

          <div className="game-timer-wrap">
            <div className="game-timer-bar" aria-hidden="true">
              <div
                className={"game-timer-bar-fill" + (timeLeft <= 15 ? " is-low" : "")}
                style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="board-frame">
          <MoleField
            holes={holes}
            activeHole={activeHole}
            whackedHole={whackedHole}
            onHoleClick={onHoleClick}
          />
        </div>

        <div className="game-controls">
          <div className="game-controls-row">
            <button
              type="button"
              className="start-btn"
              onClick={startGame}
              disabled={isPlaying || noLives}
            >
              {isPlaying ? "Играем..." : "Начать раунд"}
            </button>
            {isPlaying ? (
              <button type="button" className="stop-btn" onClick={() => stopGame(score)}>
                Стоп
              </button>
            ) : null}
          </div>
          {!isPlaying ? <p className="game-hint">Нажимай на крота — 1 минута, 1 жизнь за раунд</p> : null}
        </div>

        {noLives && nextLifeIn > 0 ? (
          <p className="game-message game-message--warn">
            Жизни восстанавливаются. Следующая через ~{Math.ceil(nextLifeIn / 60)} мин.
          </p>
        ) : null}
        {message ? <p className="game-message">{message}</p> : null}
      </div>

      <div className="space-for-navbar" />
    </PageBackground>
  );
}

export default GamePage;
