import { useEffect, useState } from "react";
import { audio } from "../utils/audioManager.js";
import "./SoundToggle.css";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(audio.isEnabled());
  const [visible, setVisible] = useState(audio.isUnlocked());

  useEffect(() => {
    return audio.subscribe(() => {
      setEnabled(audio.isEnabled());
      setVisible(audio.isUnlocked());
    });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={"sound-toggle" + (enabled ? "" : " sound-toggle--off")}
      onClick={() => audio.toggleEnabled()}
      aria-label={enabled ? "Выключить звук" : "Включить звук"}
      title={enabled ? "Звук вкл" : "Звук выкл"}
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
