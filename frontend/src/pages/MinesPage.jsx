import "./MinesPage.css";
import Header from "../components/Header.jsx";
import PageBackground from "../components/PageBackground.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";
import { MINE_TILES } from "../assets/mineTiles.js";
import { audio } from "../utils/audioManager.js";
import React, { useCallback, useEffect, useRef, useState } from "react";

const ROUND_SECONDS = 60;
const GRID_SIZE = 5;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function tileImage(cell) {
  if (!cell || cell === "hidden") return MINE_TILES.closed;
  if (cell === "mine") return MINE_TILES.mine;
  if (cell.startsWith("gold")) return MINE_TILES.gold;
  return MINE_TILES.empty;
}

function MinesPage({ header_info, apiFetch, user, refreshUser, nextLifeIn }) {
  const [sessionId, setSessionId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [cells, setCells] = useState(() => Array(25).fill("hidden"));
  const [sessionGold, setSessionGold] = useState(0);
  const [opensCount, setOpensCount] = useState(0);
  const [maxOpens, setMaxOpens] = useState(7);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const tickRef = useRef(null);
  const sessionIdRef = useRef(null);
  const sessionGoldRef = useRef(0);

  const lives = user?.game_mechanic?.lives ?? 0;
  const noLives = !isPlaying && lives <= 0;

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    sessionGoldRef.current = sessionGold;
  }, [sessionGold]);

  useEffect(() => {
    return () => clearInterval(tickRef.current);
  }, []);

  const endPlaying = useCallback(() => {
    clearInterval(tickRef.current);
    setIsPlaying(false);
    setSessionId(null);
    sessionIdRef.current = null;
    audio.stopGameMusic();
    audio.playMenuMusic();
  }, []);

  const finishMessage = useCallback((data) => {
    if (data.result === "mine") {
      return "Мина! Золото этой игры потеряно.";
    }
    if (data.result === "timeout") {
      return data.awarded > 0
        ? `Время вышло. Забрано ${data.awarded} золота.`
        : "Время вышло.";
    }
    if (data.result === "cashout" || data.status === "finished") {
      const n = data.awarded ?? 0;
      return n > 0 ? `Забрано ${n} золота!` : "Игра завершена.";
    }
    return "";
  }, []);

  const applyReveal = useCallback((cellIndex, data) => {
    setCells((prev) => {
      const next = [...prev];
      if (data.result === "mine") {
        next[cellIndex] = "mine";
      } else if (data.gold_value > 0) {
        next[cellIndex] = "gold";
      } else {
        next[cellIndex] = "empty";
      }
      return next;
    });
    setSessionGold(data.session_gold ?? 0);
    setOpensCount(data.opens_count ?? 0);
    setMaxOpens(data.max_opens ?? 7);
    if (typeof data.seconds_left === "number") {
      setTimeLeft(data.seconds_left);
    }
  }, []);

  const handleSessionEnd = useCallback(
    async (data) => {
      const msg = finishMessage(data);
      if (msg) setMessage(msg);
      endPlaying();
      setCells(Array(25).fill("hidden"));
      setSessionGold(0);
      setOpensCount(0);
      await refreshUser();
    },
    [endPlaying, finishMessage, refreshUser]
  );

  const closeSession = useCallback(
    async (endpoint) => {
      const sid = sessionIdRef.current;
      if (!sid || busy) return;
      setBusy(true);
      try {
        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify({ session_id: sid }),
        });
        await handleSessionEnd(data);
      } catch {
        setMessage("Не удалось завершить игру.");
        endPlaying();
      } finally {
        setBusy(false);
      }
    },
    [apiFetch, busy, handleSessionEnd, endPlaying]
  );

  const cashout = useCallback(() => closeSession("/mines/cashout"), [closeSession]);
  const forfeit = useCallback(() => closeSession("/mines/forfeit"), [closeSession]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current);
          if (sessionIdRef.current) {
            if (sessionGoldRef.current > 0) {
              cashout();
            } else {
              forfeit();
              setMessage("Время вышло.");
            }
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [isPlaying, cashout, forfeit, endPlaying]);

  const startGame = async () => {
    audio.unlock();
    setMessage("");
    setBusy(true);
    try {
      const data = await apiFetch("/mines/start", { method: "POST" });
      await refreshUser();
      setSessionId(data.session_id);
      sessionIdRef.current = data.session_id;
      setIsPlaying(true);
      setTimeLeft(data.seconds_left ?? ROUND_SECONDS);
      setMaxOpens(data.max_opens ?? 7);
      setOpensCount(0);
      setSessionGold(0);
      setCells(Array(25).fill("hidden"));
      audio.playGameMusic();
    } catch (e) {
      const wait = e?.body?.next_life_in_seconds || e?.body?.detail?.next_life_in_seconds;
      if (e.status === 403 && wait) {
        setMessage(`Жизни закончились. Следующая через ~${Math.ceil(wait / 60)} мин.`);
      } else {
        setMessage("Не удалось начать игру.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onCellClick = async (index) => {
    const sid = sessionIdRef.current;
    if (!isPlaying || !sid || busy) return;
    if (cells[index] !== "hidden") return;

    setBusy(true);
    try {
      const data = await apiFetch("/mines/reveal", {
        method: "POST",
        body: JSON.stringify({ session_id: sid, cell: index }),
      });
      applyReveal(index, data);

      if (data.status === "exploded" || data.status === "finished") {
        await handleSessionEnd(data);
      } else if (data.result === "gold" || data.result === "empty") {
        setMessage(
          data.gold_value > 0
            ? `+${data.gold_value} золота (в игре: ${data.session_gold})`
            : "Пусто"
        );
      }
    } catch {
      setMessage("Не удалось открыть клетку.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageBackground image={BACKGROUNDS.mines} className="mines-page" blur>
      <Header header_info={header_info} title="Сокровища" />
      <div className="space-for-header" />

      <div className="mines-ui">
        <div className="mines-hud">
          <div className="mines-stat">
            <span className="label">Время</span>
            <span className="value">{formatTime(timeLeft)}</span>
          </div>
          <div className="mines-stat">
            <span className="label">В игре</span>
            <span className="value">{sessionGold}</span>
          </div>
          <div className="mines-stat">
            <span className="label">Открыто</span>
            <span className="value">
              {opensCount}/{maxOpens}
            </span>
          </div>
        </div>

        <div className="mines-grid" role="grid">
          {cells.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              className="mines-cell"
              disabled={!isPlaying || cell !== "hidden" || busy}
              onClick={() => onCellClick(idx)}
            >
              <img src={tileImage(cell)} alt="" />
              {cell.startsWith("gold") && isPlaying ? (
                <span className="mines-cell__label">+</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mines-controls">
          {!isPlaying ? (
            <button type="button" className="mines-start-btn" onClick={startGame} disabled={noLives || busy}>
              Начать игру
            </button>
          ) : (
            <button
              type="button"
              className="mines-cashout-btn"
              onClick={cashout}
              disabled={busy || sessionGold <= 0}
            >
              Забрать золото
            </button>
          )}
          {!isPlaying ? (
            <p className="mines-hint">1 жизнь · 60 сек · до 7 клеток · мина сжигает золото игры</p>
          ) : null}
        </div>

        {noLives && nextLifeIn > 0 ? (
          <p className="mines-message mines-message--warn">
            Следующая жизнь через ~{Math.ceil(nextLifeIn / 60)} мин.
          </p>
        ) : null}
        {message ? <p className="mines-message">{message}</p> : null}
      </div>

      <div className="space-for-navbar" />
    </PageBackground>
  );
}

export default MinesPage;
