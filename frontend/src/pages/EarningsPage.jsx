import "./EarningsPage.css";
import React, { useCallback, useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import PageBackground from "../components/PageBackground.jsx";
import BonusDayContainer from "../components/BonusDayContainer.jsx";
import Stat from "../components/Stat.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";

function EarningsPage({ header_info, apiFetch, refreshUser }) {
  const [data, setData] = useState(null);
  const [bonus, setBonus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [bonusMessage, setBonusMessage] = useState("");

  const loadEarnings = useCallback(async () => {
    try {
      const res = await apiFetch("/earnings", { method: "GET" });
      setData({
        ...res,
        last_played: res.last_played ? new Date(res.last_played).toLocaleString() : "-",
      });
    } catch {
      setData({
        gold_earned: 0,
        games_played: 0,
        best_score: 0,
        last_played: "-",
        referral_earned: 0,
      });
    }
  }, [apiFetch]);

  const loadBonus = useCallback(async () => {
    try {
      const res = await apiFetch("/daily-bonus", { method: "GET" });
      setBonus(res);
    } catch {
      setBonus(null);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadEarnings();
    loadBonus();
  }, [loadEarnings, loadBonus]);

  const handleClaim = async () => {
    setClaiming(true);
    setBonusMessage("");
    try {
      const res = await apiFetch("/daily-bonus/claim", { method: "POST" });
      setBonusMessage(`+${res.gold_awarded} золота!`);
      await loadBonus();
      await loadEarnings();
      if (refreshUser) await refreshUser();
    } catch (e) {
      const wait = e?.body?.next_claim_in_seconds ?? e?.body?.detail?.next_claim_in_seconds;
      if (wait) {
        setBonusMessage(`Подождите ещё ${Math.ceil(wait / 60)} мин.`);
      } else {
        setBonusMessage("Бонус пока недоступен.");
      }
      await loadBonus();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <PageBackground image={BACKGROUNDS.earnings} className="earnings-page" blur>
      <div className="space-for-header" />
      <Header header_info={header_info} title="Earnings" />
      <div className="earnings-content">
        <BonusDayContainer bonus={bonus} onClaim={handleClaim} claiming={claiming} />
        {bonusMessage ? <p className="earnings-bonus-msg">{bonusMessage}</p> : null}
        {data ? <Stat data={data} /> : null}
      </div>
      <div className="space-for-navbar" />
    </PageBackground>
  );
}

export default EarningsPage;
