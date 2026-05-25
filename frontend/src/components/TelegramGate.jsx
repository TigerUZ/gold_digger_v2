import React, { useEffect, useState } from "react";
import "./TelegramGate.css";

function hasTelegramInitData() {
  try {
    return Boolean(window.Telegram?.WebApp?.initData);
  } catch {
    return false;
  }
}

function TelegramGate({ children }) {
  const [allowed, setAllowed] = useState(hasTelegramInitData());
  const [botUrl, setBotUrl] = useState("");

  useEffect(() => {
    setAllowed(hasTelegramInitData());
    (async () => {
      try {
        const res = await fetch("/public/bot");
        if (res.ok) {
          const data = await res.json();
          if (data.telegram_url) setBotUrl(data.telegram_url);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  if (allowed) return children;

  return (
    <div className="telegram-gate">
      <div className="telegram-gate-card">
        <h1>Откройте игру в Telegram</h1>
        <p>
          В обычном браузере игра не работает — нужен вход через бота, чтобы Telegram передал
          авторизацию.
        </p>
        {botUrl ? (
          <a className="telegram-gate-btn" href={botUrl}>
            Открыть бота в Telegram
          </a>
        ) : (
          <p className="telegram-gate-hint">Укажите BOT_USERNAME в .env и перезапустите сервер.</p>
        )}
        <p className="telegram-gate-steps">
          1. Нажмите кнопку выше
          <br />
          2. В боте нажмите «Играть в Gold Digger»
          <br />
          3. Не открывайте ссылку ngrok в Safari/Chrome
        </p>
      </div>
    </div>
  );
}

export default TelegramGate;
