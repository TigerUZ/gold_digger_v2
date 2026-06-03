import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { audio } from "../utils/audioManager.js";

/** Menu music on all screens except active game routes. */
const GAME_PATHS = ["/mole", "/game", "/mines"];

export default function AudioRouter() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!audio.isUnlocked()) return undefined;
    if (GAME_PATHS.includes(pathname)) return undefined;

    audio.stopGameMusic();
    audio.playMenuMusic();
    return undefined;
  }, [pathname]);

  return null;
}
