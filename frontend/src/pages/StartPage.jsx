import React from "react";
import { useNavigate } from "react-router-dom";
import "./StartPage.css";

export default function StartPage() {
  const navigate = useNavigate();

  const handlePlay = () => {
    navigate("/game");
  };

  return (
    <div className="start-container">
      <button className="play-btn" onClick={handlePlay}>
        <img src="/img/start/play.png" alt="Play" />
      </button>
    </div>
  );
}
