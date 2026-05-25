import "./FriendsPage.css";
import React, { useCallback, useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import PageBackground from "../components/PageBackground.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";

function showAlert(message) {
  try {
    window.Telegram?.WebApp?.showAlert?.(message);
  } catch {
    // ignore
  }
}

function FriendsPage({ header_info, apiFetch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/friends", { method: "GET" });
      setData(res);
    } catch {
      setData({
        referral_link: "",
        invited_count: 0,
        total_earned: 0,
        referrals: [],
      });
      setMessage("Не удалось загрузить данные. Перезапустите игру через Telegram.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleCopy = async () => {
    if (!data?.referral_link) {
      setMessage("Ссылка пока недоступна. Проверьте TOKEN в .env и перезапустите сервер.");
      return;
    }
    try {
      await navigator.clipboard.writeText(data.referral_link);
      setMessage("Ссылка скопирована!");
      showAlert("Ссылка скопирована!");
    } catch {
      setMessage("Не удалось скопировать ссылку.");
    }
  };

  const handleShare = () => {
    if (!data?.referral_link) {
      setMessage("Ссылка пока недоступна.");
      return;
    }
    const shareText = encodeURIComponent("Присоединяйся к Gold Digger!");
    const shareUrl = encodeURIComponent(data.referral_link);
    const tgShare = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;

    try {
      window.Telegram?.WebApp?.openTelegramLink?.(tgShare);
    } catch {
      window.open(tgShare, "_blank");
    }
  };

  const linkText = loading
    ? "Загрузка..."
    : data?.referral_link || "Ссылка не сгенерирована — проверьте TOKEN в .env";

  return (
    <PageBackground image={BACKGROUNDS.friends} className="friends-page" blur>
      <div className="space-for-header" />
      <Header header_info={header_info} title="Friends" />
      <main className="page-content friends-content-container">
        <section className="ui-panel friends-card">
          <h2 className="ui-panel-title">Пригласи друзей</h2>
          <p className="ui-panel-subtitle">
            Друг открывает ссылку в Telegram → «Старт» → «Играть». Вы оба получите бонусное золото.
          </p>

          <div className="ui-stat-grid ui-stat-grid--2 friends-stats">
            <div className="ui-stat-chip">
              <span className="icon" aria-hidden="true">👥</span>
              <span className="label">Приглашено</span>
              <span className="value">{data?.invited_count ?? 0}</span>
            </div>
            <div className="ui-stat-chip">
              <span className="icon" aria-hidden="true">🪙</span>
              <span className="label">Заработано</span>
              <span className="value">{data?.total_earned ?? 0}</span>
            </div>
          </div>

          <p className="friends-link-label">Ваша ссылка</p>
          <div className="ui-link-box friends-link-box">
            <p className="friends-link">{linkText}</p>
          </div>

          <div className="ui-btn-row friends-actions">
            <button type="button" className="ui-btn ui-btn--primary" onClick={handleCopy}>
              Копировать
            </button>
            <button type="button" className="ui-btn ui-btn--secondary" onClick={handleShare}>
              Поделиться
            </button>
          </div>

          {message ? <p className={"ui-message" + (message.includes("скопирована") ? " ui-message--success" : "")}>{message}</p> : null}
        </section>

        <section className="ui-panel friends-list-panel">
          <h3 className="ui-panel-title">Ваши друзья</h3>
          {data?.referrals?.length ? (
            <ul className="ui-list">
              {data.referrals.map((item, index) => (
                <li key={`${item.name}-${index}`} className="ui-list-item">
                  <span>{item.name}</span>
                  <strong className="friends-list-gold">+{item.gold}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="friends-empty">Пока никого нет — отправьте ссылку первому другу.</p>
          )}
        </section>
      </main>
      <div className="space-for-navbar" />
    </PageBackground>
  );
}

export default FriendsPage;
