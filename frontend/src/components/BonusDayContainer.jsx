import React, { useEffect, useState, useRef } from "react";
import './BonusDayContainer.css';
import BonusDay from './BonusDay.jsx';

function BonusDayContainer({targetDate}) {
    const calculateTimeRemaining = () => {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  };


    const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());
    const timerRef = useRef(null);

    useEffect(() => {
    timerRef.current = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => {
        clearInterval(timerRef.current);
        };
    }, [targetDate]); // Recalculate if targetDate changes

    const { days, hours, minutes, seconds } = timeRemaining;


    return (
        <>
            <section className="bonus-day-section">
                <div className="bonus-day-section-container">
                    <BonusDay active={true} selected={true} />
                    <BonusDay day="2" value={15} active={true} />
                    <BonusDay day="3" value={20} />
                    <BonusDay day="4" value={25} />
                    <BonusDay day="5" value={30} />
                    <BonusDay day="6" value={35} />
                    <BonusDay day="7" value={40} />
                </div>
                <div className="bonus-day-section-timer-container">
                    <p>Time remaining for the next slot to open</p>
                    <span className="bonus-day-section-timer">{
                        String(hours).padStart(2, '0') + ":" + String(minutes).padStart(2, '0') + ":" + String(seconds).padStart(2, '0')}</span>
                </div>
            </section>
        </>
    );
}

export default BonusDayContainer;