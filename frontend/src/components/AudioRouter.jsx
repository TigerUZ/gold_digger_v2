import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { audio } from "../utils/audioManager.js";

/** Menu music on all screens except /game (game page controls its own music). */
export default function AudioRouter() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!audio.isUnlocked()) return undefined;
    if (pathname === "/game") return undefined;

    audio.stopGameMusic();
    audio.playMenuMusic();
    return undefined;
  }, [pathname]);

  return null;
}
