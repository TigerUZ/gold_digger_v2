import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Navbar from "./components/Navbar.jsx";
import GamePage from "./pages/GamePage.jsx";
import EarningsPage from "./pages/EarningsPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import WalletPage from "./pages/WalletPage.jsx";

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

function App() {
  const [initData, setInitData] = useState("");
  const [user, setUser] = useState(null);
  const [nextLifeIn, setNextLifeIn] = useState(0);

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
    setNextLifeIn(me.next_life_in_seconds);
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

  const header_info = useMemo(() => {
    const h = JSON.parse(JSON.stringify(headersTemplate));
    if (user?.game_mechanic) {
      h.Home.left.value = user.game_mechanic.lives;
      h.Home.middle.score = user.game_mechanic.total_gold;
      // right side: minutes to next life (or 0)
      if (nextLifeIn && nextLifeIn > 0) {
        const mins = Math.ceil(nextLifeIn / 60);
        h.Home.right.value = mins;
      } else {
        h.Home.right.value = 0;
      }
    }
    return h;
  }, [user, nextLifeIn]);

  return (
    <>
      <Router>
        <Routes>
          <Route
            path="/game"
            element={<GamePage header_info={header_info} apiFetch={apiFetch} user={user} refreshUser={refreshUser} />}
          />
          <Route
            path="/earnings"
            element={<EarningsPage header_info={header_info} apiFetch={apiFetch} />}
          />
          <Route path="/friends" element={<FriendsPage header_info={header_info} />} />
          <Route path="/wallet" element={<WalletPage header_info={header_info} />} />

          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
        <Navbar />
      </Router>
    </>
  );
}

export default App;
