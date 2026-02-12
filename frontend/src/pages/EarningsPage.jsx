import "./EarningsPage.css";
import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import BonusDayContainer from "../components/BonusDayContainer.jsx";
import Stat from "../components/Stat.jsx";

function EarningsPage({ header_info, apiFetch }) {
  const [data, setData] = useState(null);

  // Placeholder daily bonus timer (1 hour) until daily bonus backend is implemented
  const futureDate = new Date();
  futureDate.setSeconds(futureDate.getSeconds() + 3600);
  const targetTimestamp = futureDate.getTime();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/earnings", { method: "GET" });
        // Format last_played into a human-ish date
        const formatted = {
          ...res,
          last_played: res.last_played
            ? new Date(res.last_played).toLocaleString()
            : "-",
        };
        setData(formatted);
      } catch (e) {
        // If user opened outside Telegram, api will fail
        setData({
          gold_earned: 0,
          games_played: 0,
          best_score: 0,
          last_played: "-",
          referral_earned: 0,
        });
      }
    })();
  }, [apiFetch]);

  return (
    <>
      <div className="space-for-header"></div>
      <Header header_info={header_info} title="Earnings" />
      <div className="earnings-content">
        <BonusDayContainer targetDate={targetTimestamp} />
        {data ? <Stat data={data} /> : null}
      </div>
      <div className="space-for-navbar"></div>
    </>
  );
}

export default EarningsPage;
