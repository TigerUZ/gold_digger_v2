import "./GamePage.css";
import Header from "../components/Header.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";

const ROUND_SECONDS = 60;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function GamePage({ header_info, apiFetch, user, refreshUser }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [activeHole, setActiveHole] = useState(null);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");

  const tickRef = useRef(null);
  const moleIntervalRef = useRef(null);
  const moleTimeoutRef = useRef(null);

  const holes = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);

  useEffect(() => {
    return () => {
      clearInterval(tickRef.current);
      clearInterval(moleIntervalRef.current);
      clearTimeout(moleTimeoutRef.current);
    };
  }, []);

  const stopGame = async (finalScore) => {
    clearInterval(tickRef.current);
    clearInterval(moleIntervalRef.current);
    clearTimeout(moleTimeoutRef.current);
    setActiveHole(null);
    setIsPlaying(false);

    try {
      await apiFetch("/game/finish", {
        method: "POST",
        body: JSON.stringify({ score: finalScore }),
      });
      await refreshUser();
      setMessage(`Round finished! You scored ${finalScore}.`);
    } catch (e) {
      setMessage("Could not save the round. Try again.");
    }
  };

  const startGame = async () => {
    setMessage("");

    try {
      await apiFetch("/game/start", { method: "POST" });
      await refreshUser();
    } catch (e) {
      // backend returns next_life_in_seconds in detail for 403
      const wait = e?.body?.next_life_in_seconds || e?.body?.detail?.next_life_in_seconds;
      if (e.status === 403 && wait) {
        const mins = Math.ceil(wait / 60);
        setMessage(`No lives left. Next life in ~${mins} min.`);
      } else {
        setMessage("Can't start the game. Make sure you opened it from Telegram.");
      }
      return;
    }

    setIsPlaying(true);
    setScore(0);
    setTimeLeft(ROUND_SECONDS);

    // 1-second timer
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // stop at 0
          stopGame(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // mole logic
    const showMole = () => {
      const idx = Math.floor(Math.random() * 9);
      setActiveHole(idx);
      clearTimeout(moleTimeoutRef.current);
      moleTimeoutRef.current = setTimeout(() => {
        setActiveHole(null);
      }, 550);
    };

    showMole();
    moleIntervalRef.current = setInterval(showMole, 700);
  };

  // keep latest score for stopGame called from timer closure
  const scoreRef = useRef(0);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const onHoleClick = (idx) => {
    if (!isPlaying) return;
    if (idx !== activeHole) return;
    setScore((s) => s + 1);
    setActiveHole(null);
  };

  return (
    <>
      <main className="home_main_page">
        <Header header_info={header_info} title="Home" />

        <div className="game-ui">
          <div className="game-stats">
            <div className="game-stat">
              <span className="label">Time</span>
              <span className="value">{formatTime(timeLeft)}</span>
            </div>
            <div className="game-stat">
              <span className="label">Score</span>
              <span className="value">{score}</span>
            </div>
            <div className="game-stat">
              <span className="label">Lives</span>
              <span className="value">{user?.game_mechanic?.lives ?? "-"}</span>
            </div>
          </div>

          <div className="board">
            {holes.map((idx) => (
              <button
                key={idx}
                className={"hole" + (idx === activeHole ? " active" : "")}
                onClick={() => onHoleClick(idx)}
                aria-label={`hole-${idx}`}
              >
                {idx === activeHole ? <div className="mole" /> : null}
              </button>
            ))}
          </div>

          <div className="game-controls">
            <button className="start-btn" onClick={startGame} disabled={isPlaying}>
              {isPlaying ? "Playing..." : "Start 1-min round"}
            </button>
            {isPlaying ? (
              <button className="stop-btn" onClick={() => stopGame(score)}>
                Finish early
              </button>
            ) : null}
          </div>

          {message ? <p className="game-message">{message}</p> : null}
        </div>

        <div className="space-for-navbar"></div>
      </main>
    </>
  );
}

export default GamePage;
