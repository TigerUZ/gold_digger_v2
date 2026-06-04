const STORAGE_KEY = "gd_sound_enabled";

const MUSIC = {
  menu: { src: "/sounds/menu-loop.mp3", volume: 0.32 },
  game: { src: "/sounds/game-loop.mp3", volume: 0.38 },
  mines: { src: "/sounds/mines-loop.mp3", volume: 0.38 },
};

const SFX = {
  whack: { src: "/sounds/whack.mp3", volume: 0.55 },
  coin: { src: "/sounds/coin.mp3", volume: 0.45 },
  minesEmpty: { src: "/sounds/mines-empty.mp3", volume: 0.4 },
  minesGold: { src: "/sounds/mines-gold.mp3", volume: 0.5 },
  minesMine: { src: "/sounds/mines-mine.mp3", volume: 0.55 },
  minesCashout: { src: "/sounds/mines-cashout.mp3", volume: 0.5 },
};

class AudioManager {
  constructor() {
    this.unlocked = false;
    this.enabled = localStorage.getItem(STORAGE_KEY) !== "false";
    this.menuMusic = null;
    this.gameMusic = null;
    this.minesMusic = null;
    this.activeTrack = null;
    this.suspendedByVisibility = false;
    this.listeners = new Set();
    this.bindVisibilityHandlers();
  }

  bindVisibilityHandlers() {
    if (typeof document === "undefined") return;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.handleAppHidden();
      } else {
        this.handleAppVisible();
      }
    });

    window.addEventListener("pagehide", () => {
      this.handleAppHidden();
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        this.handleAppVisible();
      }
    });

    try {
      const tg = window.Telegram?.WebApp;
      tg?.onEvent?.("visibility_changed", ({ is_visible: isVisible }) => {
        if (isVisible) {
          this.handleAppVisible();
        } else {
          this.handleAppHidden();
        }
      });
    } catch {
      // ignore outside Telegram
    }
  }

  isMusicPlaying() {
    return Boolean(
      (this.menuMusic && !this.menuMusic.paused) ||
        (this.gameMusic && !this.gameMusic.paused) ||
        (this.minesMusic && !this.minesMusic.paused)
    );
  }

  handleAppHidden() {
    if (!this.unlocked || !this.isMusicPlaying()) return;
    this.suspendedByVisibility = true;
    this.muteAll();
  }

  handleAppVisible() {
    if (!this.suspendedByVisibility) return;
    this.suspendedByVisibility = false;
    this.resumeActive();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  isUnlocked() {
    return this.unlocked;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value) {
    this.enabled = value;
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    if (!value) {
      this.suspendedByVisibility = false;
      this.muteAll();
    } else {
      this.resumeActive();
    }
    this.notify();
  }

  toggleEnabled() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.menuMusic = this.createLoop(MUSIC.menu);
    this.gameMusic = this.createLoop(MUSIC.game);
    this.minesMusic = this.createLoop(MUSIC.mines);
    this.notify();
  }

  createLoop({ src, volume }) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = "auto";
    return audio;
  }

  safePlay(audio) {
    if (!audio || !this.unlocked || !this.enabled) return;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch((err) => {
        console.warn("[audio] play failed:", audio.src, err?.message || err);
      });
    }
  }

  pause(audio, reset = false) {
    if (!audio) return;
    audio.pause();
    if (reset) {
      audio.currentTime = 0;
    }
  }

  pauseOtherGameTracks(except) {
    if (except !== "game") {
      this.pause(this.gameMusic, false);
    }
    if (except !== "mines") {
      this.pause(this.minesMusic, false);
    }
    if (except !== "menu") {
      this.pause(this.menuMusic, false);
    }
  }

  playMenuMusic() {
    this.activeTrack = "menu";
    if (!this.unlocked || !this.enabled) return;
    this.pauseOtherGameTracks("menu");
    this.safePlay(this.menuMusic);
  }

  playGameMusic() {
    this.activeTrack = "game";
    if (!this.unlocked || !this.enabled) return;
    this.pauseOtherGameTracks("game");
    this.safePlay(this.gameMusic);
  }

  playMinesMusic() {
    this.activeTrack = "mines";
    if (!this.unlocked || !this.enabled) return;
    this.pauseOtherGameTracks("mines");
    this.safePlay(this.minesMusic);
  }

  stopMenuMusic() {
    this.pause(this.menuMusic, true);
    if (this.activeTrack === "menu") {
      this.activeTrack = null;
    }
  }

  stopGameMusic() {
    this.pause(this.gameMusic, true);
    if (this.activeTrack === "game") {
      this.activeTrack = null;
    }
  }

  stopMinesMusic() {
    this.pause(this.minesMusic, true);
    if (this.activeTrack === "mines") {
      this.activeTrack = null;
    }
  }

  muteAll() {
    this.pause(this.menuMusic, false);
    this.pause(this.gameMusic, false);
    this.pause(this.minesMusic, false);
  }

  resumeActive() {
    if (!this.unlocked || !this.enabled) return;
    if (this.activeTrack === "mines") {
      this.safePlay(this.minesMusic);
    } else if (this.activeTrack === "game") {
      this.safePlay(this.gameMusic);
    } else if (this.activeTrack === "menu") {
      this.safePlay(this.menuMusic);
    }
  }

  stopAll() {
    this.stopMenuMusic();
    this.stopGameMusic();
    this.stopMinesMusic();
  }

  playOneShot({ src, volume }) {
    if (!this.unlocked || !this.enabled) return;
    const audio = new Audio(src);
    audio.volume = volume;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch((err) => {
        console.warn("[audio] sfx failed:", src, err?.message || err);
      });
    }
  }

  playOneShotWithFallback(primary, fallback) {
    if (!this.unlocked || !this.enabled) return;
    const audio = new Audio(primary.src);
    audio.volume = primary.volume;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => this.playOneShot(fallback));
    }
    audio.addEventListener(
      "error",
      () => {
        this.playOneShot(fallback);
      },
      { once: true }
    );
  }

  hapticImpact(style = "medium") {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch {
      // ignore outside Telegram
    }
  }

  playWhack() {
    this.playOneShot(SFX.whack);
    this.hapticImpact("medium");
  }

  playCoin() {
    window.setTimeout(() => {
      this.playOneShot(SFX.coin);
    }, 90);
  }

  playMinesReveal(data) {
    const result = data?.result;
    const goldValue = data?.gold_value ?? 0;
    if (result === "mine" || data?.status === "exploded") {
      this.playOneShot(SFX.minesMine);
      this.hapticImpact("heavy");
    } else if (result === "gold" || goldValue > 0) {
      this.playOneShotWithFallback(SFX.minesGold, SFX.coin);
      this.hapticImpact("light");
    } else if (result === "empty" || result === "timeout") {
      this.playOneShot(SFX.minesEmpty);
      this.hapticImpact("soft");
    }
  }

  playMinesCashout() {
    this.playOneShot(SFX.minesCashout);
    this.playCoin();
    this.hapticImpact("medium");
  }
}

export const audio = new AudioManager();
