const STORAGE_KEY = "gd_sound_enabled";

const MUSIC = {
  menu: { src: "/sounds/menu-loop.mp3", volume: 0.32 },
  game: { src: "/sounds/game-loop.mp3", volume: 0.38 },
};

const SFX = {
  whack: { src: "/sounds/whack.mp3", volume: 0.55 },
  coin: { src: "/sounds/coin.mp3", volume: 0.45 },
};

class AudioManager {
  constructor() {
    this.unlocked = false;
    this.enabled = localStorage.getItem(STORAGE_KEY) !== "false";
    this.menuMusic = null;
    this.gameMusic = null;
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
        (this.gameMusic && !this.gameMusic.paused)
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

  playMenuMusic() {
    this.activeTrack = "menu";
    if (!this.unlocked || !this.enabled) return;
    this.pause(this.gameMusic, false);
    this.safePlay(this.menuMusic);
  }

  playGameMusic() {
    this.activeTrack = "game";
    if (!this.unlocked || !this.enabled) return;
    this.pause(this.menuMusic, false);
    this.safePlay(this.gameMusic);
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

  muteAll() {
    this.pause(this.menuMusic, false);
    this.pause(this.gameMusic, false);
  }

  resumeActive() {
    if (!this.unlocked || !this.enabled) return;
    if (this.activeTrack === "game") {
      this.safePlay(this.gameMusic);
    } else if (this.activeTrack === "menu") {
      this.safePlay(this.menuMusic);
    }
  }

  stopAll() {
    this.stopMenuMusic();
    this.stopGameMusic();
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
}

export const audio = new AudioManager();
