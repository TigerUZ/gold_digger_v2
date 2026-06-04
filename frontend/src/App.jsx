import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";

import Navbar from "./components/Navbar.jsx";
import GamePage from "./pages/GamePage.jsx";
import ArcadePage from "./pages/ArcadePage.jsx";
import MinesPage from "./pages/MinesPage.jsx";
import EarningsPage from "./pages/EarningsPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import WalletPage from "./pages/WalletPage.jsx";
import StartPage from "./pages/StartPage.jsx";
import TelegramGate from "./components/TelegramGate.jsx";
import AudioRouter from "./components/AudioRouter.jsx";
import SoundToggle from "./components/SoundToggle.jsx";

import headersTemplate from "./assets/headers.json";

function getTelegramInitData() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      return tg.initData || "";
    }
  } catch (e) {
    // ignore
  }
  return "";
}

function AppRoutes() {
  const location = useLocation();
  const [initData, setInitData] = useState("");
  const [user, setUser] = useState(null);
  const [moleNextLifeIn, setMoleNextLifeIn] = useState(0);
  const [minesNextLifeIn, setMinesNextLifeIn] = useState(0);
  const isMinesRoute = location.pathname === "/mines";
  const nextLifeIn = isMinesRoute ? minesNextLifeIn : moleNextLifeIn;

  useEffect(() => {
    setInitData(getTelegramInitData());
  }, []);

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (initData) {
        headers["X-Telegram-Init-Data"] = initData;
      }

      const res = await fetch(path, { ...options, headers });
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await res.json() : await res.text();

      if (!res.ok) {
        const err = new Error("Request failed");
        err.status = res.status;
        err.body = body;
        throw err;
      }

      return body;
    },
    [initData]
  );

  const refreshUser = useCallback(async () => {
    if (!initData) return;
    const me = await apiFetch("/me", { method: "GET" });
    setUser(me.user);
    setMoleNextLifeIn(me.mole_next_life_in_seconds ?? me.next_life_in_seconds ?? 0);
    setMinesNextLifeIn(me.mines_next_life_in_seconds ?? 0);
  }, [apiFetch, initData]);

  // Initial auth + load user
  useEffect(() => {
    (async () => {
      if (!initData) return;
      // Ensure user exists server-side
      await apiFetch("/auth/webapp", {
        method: "POST",
        body: JSON.stringify({ initData }),
      });
      await refreshUser();
    })();
  }, [initData, apiFetch, refreshUser]);

  // Periodic refresh for lives timer
  useEffect(() => {
    if (!initData) return undefined;
    const interval = setInterval(() => {
      refreshUser();
    }, 30000);
    return () => clearInterval(interval);
  }, [initData, refreshUser]);

  const header_info = useMemo(() => {
    const h = JSON.parse(JSON.stringify(headersTemplate));
    if (user?.game_mechanic) {
      const gm = user.game_mechanic;
      h.Home.left.value = isMinesRoute ? (gm.mines_lives ?? gm.lives) : (gm.mole_lives ?? gm.lives);
      h.Home.middle.score = gm.total_gold;
      const wait = isMinesRoute ? minesNextLifeIn : moleNextLifeIn;
      h.Home.right.value = wait > 0 ? Math.ceil(wait / 60) : 0;
    }
    return h;
  }, [user, isMinesRoute, moleNextLifeIn, minesNextLifeIn]);

  return (
    <>
        <AudioRouter />
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/arcade" element={<ArcadePage />} />
          <Route
            path="/mole"
            element={
              <GamePage
                header_info={header_info}
                apiFetch={apiFetch}
                user={user}
                refreshUser={refreshUser}
                nextLifeIn={nextLifeIn}
              />
            }
          />
          <Route path="/game" element={<Navigate to="/mole" replace />} />
          <Route
            path="/mines"
            element={
              <MinesPage
                header_info={header_info}
                apiFetch={apiFetch}
                user={user}
                refreshUser={refreshUser}
                nextLifeIn={nextLifeIn}
              />
            }
          />
          <Route
            path="/earnings"
            element={<EarningsPage header_info={header_info} apiFetch={apiFetch} refreshUser={refreshUser} />}
          />
          <Route path="/friends" element={<FriendsPage header_info={header_info} apiFetch={apiFetch} />} />
          <Route path="/wallet" element={<WalletPage header_info={header_info} apiFetch={apiFetch} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Navbar />
        <SoundToggle />
    </>
  );
}

function App() {
  return (
    <TelegramGate>
      <Router>
        <AppRoutes />
      </Router>
    </TelegramGate>
  );
}

export default App;
