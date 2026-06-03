import React from "react";
import { useNavigate } from "react-router-dom";
import PageBackground from "../components/PageBackground.jsx";
import { BACKGROUNDS } from "../assets/backgrounds.js";
import { audio } from "../utils/audioManager.js";
import "./StartPage.css";

export default function StartPage() {
  const navigate = useNavigate();

  const handlePlay = () => {
    audio.unlock();
    navigate("/arcade");
  };

  return (
    <PageBackground image={BACKGROUNDS.start} className="start-container" overlay={false}>
      <button type="button" className="play-btn" onClick={handlePlay}>
        <img src="/img/start/play.png" alt="Play" />
      </button>
    </PageBackground>
  );
}
