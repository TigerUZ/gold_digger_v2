import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { audio } from "../utils/audioManager.js";

const MOLE_PATHS = ["/mole", "/game"];
const MINES_PATHS = ["/mines"];

export default function AudioRouter() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!audio.isUnlocked()) return undefined;

    if (MINES_PATHS.includes(pathname)) {
      audio.stopGameMusic();
      audio.playMinesMusic();
      return undefined;
    }

    if (MOLE_PATHS.includes(pathname)) {
      audio.stopMinesMusic();
      audio.playGameMusic();
      return undefined;
    }

    audio.stopGameMusic();
    audio.stopMinesMusic();
    audio.playMenuMusic();
    return undefined;
  }, [pathname]);

  return null;
}
