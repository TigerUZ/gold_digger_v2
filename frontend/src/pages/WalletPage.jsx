import "./WalletPage.css";
import React, { useCallback, useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import PageBackground from "../components/PageBackground.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";

const WALLET_ROWS = [
  { key: "best_score", label: "Лучший раунд" },
  { key: "games_played", label: "Игр сыграно" },
  { key: "lives", label: "Жизни", format: (d) => `${d.lives ?? 0}/${d.max_lives ?? 5}` },
  { key: "referral_earned", label: "Реферальный доход" },
];

function WalletPage({ header_info, apiFetch }) {
  const [data, setData] = useState(null);

  const loadWallet = useCallback(async () => {
    try {
      const res = await apiFetch("/wallet", { method: "GET" });
      setData(res);
    } catch {
      setData({
        balance: 0,
        games_played: 0,
        best_score: 0,
        lives: 0,
        max_lives: 5,
        referral_earned: 0,
      });
    }
  }, [apiFetch]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  return (
    <PageBackground image={BACKGROUNDS.wallet} className="wallet-page" blur>
      <div className="space-for-header" />
      <Header header_info={header_info} title="Wallet" />
      <main className="page-content wallet-content-container">
        <section className="wallet-balance-card">
          <p className="wallet-label">Ваш баланс</p>
          <div className="wallet-balance-row">
            <span className="wallet-coin" aria-hidden="true">🪙</span>
            <p className="wallet-balance">{data?.balance ?? 0}</p>
          </div>
          <p className="wallet-balance-unit">золота</p>
        </section>

        <section className="ui-panel wallet-details">
          <h2 className="ui-panel-title">Обзор</h2>
          <ul className="ui-list">
            {WALLET_ROWS.map((row) => (
              <li key={row.key} className="ui-list-item">
                <span>{row.label}</span>
                <strong>
                  {row.format ? row.format(data ?? {}) : (data?.[row.key] ?? 0)}
                </strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="ui-panel wallet-withdraw">
          <span className="ui-badge">Скоро</span>
          <h3 className="wallet-withdraw-title">Вывод средств</h3>
          <p>Скоро появится возможность обменять золото на призы. Следите за обновлениями!</p>
        </section>
      </main>
      <div className="space-for-navbar" />
    </PageBackground>
  );
}

export default WalletPage;
