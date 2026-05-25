import React, { useEffect, useState, useRef } from "react";
import "./BonusDayContainer.css";
import BonusDay from "./BonusDay.jsx";

function BonusDayContainer({ bonus, onClaim, claiming }) {
  const calculateTimeRemaining = (targetMs) => {
    const distance = targetMs - Date.now();
    if (distance < 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  };

  const [targetDate, setTargetDate] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    if (!bonus) return;
    if (bonus.can_claim) {
      setTargetDate(0);
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const target = Date.now() + bonus.next_claim_in_seconds * 1000;
    setTargetDate(target);
    setTimeRemaining(calculateTimeRemaining(target));
  }, [bonus]);

  useEffect(() => {
    if (!targetDate) return undefined;

    timerRef.current = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [targetDate]);

  if (!bonus) return null;

  const { rewards, step, can_claim } = bonus;
  const { hours, minutes, seconds } = timeRemaining;

  return (
    <section className="bonus-day-section">
      <h2 className="bonus-day-section-header">Ежедневный бонус</h2>
      <p className="bonus-day-section-sub">Заходи каждый день — награда растёт!</p>
      <div className="bonus-day-section-container">
        {rewards.map((value, index) => {
          const dayLabel = index === 0 ? "Сегодня" : `День ${index + 1}`;
          const isPast = index < step;
          const isCurrent = index === step;
          return (
            <BonusDay
              key={index}
              day={dayLabel}
              value={value}
              active={isPast || isCurrent}
              selected={isCurrent && can_claim}
            />
          );
        })}
      </div>

      <div className="bonus-day-section-timer-container">
        {can_claim ? (
          <>
            <p>Ежедневный бонус готов!</p>
            <button
              type="button"
              className="bonus-claim-btn"
              onClick={onClaim}
              disabled={claiming}
            >
              {claiming ? "Получаем..." : "Забрать бонус"}
            </button>
          </>
        ) : (
          <>
            <p>До следующего бонуса</p>
            <span className="bonus-day-section-timer">
              {String(hours).padStart(2, "0")}:
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </span>
          </>
        )}
      </div>
    </section>
  );
}

export default BonusDayContainer;
