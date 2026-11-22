import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { SfxName } from '../game/types';

export type MusicName = 'menu' | 'shallow' | 'deep' | 'shop';

const SFX_SOURCES: Record<SfxName, number> = {
  swim: require('../../assets/audio/swim.mp3'),
  bubbles: require('../../assets/audio/bubbles.mp3'),
  splash: require('../../assets/audio/splash.mp3'),
  collect: require('../../assets/audio/collect.mp3'),
  chest_open: require('../../assets/audio/chest_open.mp3'),
  coins: require('../../assets/audio/coins.mp3'),
  shark: require('../../assets/audio/shark.mp3'),
  hurt: require('../../assets/audio/hurt.mp3'),
  alarm: require('../../assets/audio/alarm.mp3'),
  boat_return: require('../../assets/audio/boat_return.mp3'),
  success: require('../../assets/audio/success.mp3'),
  fail: require('../../assets/audio/fail.mp3'),
  buy: require('../../assets/audio/buy.mp3'),
  click: require('../../assets/audio/click.mp3'),
  mine: require('../../assets/audio/mine.mp3'),
  zap: require('../../assets/audio/zap.mp3'),
  drop: require('../../assets/audio/drop.mp3'),
  waves: require('../../assets/audio/waves.mp3'),
};

const MUSIC_SOURCES: Record<MusicName, number> = {
  menu: require('../../assets/audio/music_menu.mp3'),
  shallow: require('../../assets/audio/music_shallow.mp3'),
  deep: require('../../assets/audio/music_deep.mp3'),
  shop: require('../../assets/audio/music_shop.mp3'),
};

const MUSIC_VOLUME = 0.45;
const AMBIENT_VOLUME = 0.35;
const FADE_MS = 900;

class AudioManager {
  private sfxPlayers = new Map<SfxName, AudioPlayer>();
  private musicPlayers = new Map<MusicName, AudioPlayer>();
  private current: MusicName | null = null;
  private wanted: MusicName | null = null;
  private ambient: AudioPlayer | null = null;
  private ambientOn = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private unlocked = false;
  musicEnabled = true;
  sfxEnabled = true;

  async init() {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch {}
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    const wanted = this.wanted;
    this.wanted = null;
    this.current = null;
    if (wanted) this.setMusic(wanted);
    if (this.ambientOn) this.setAmbient(true);
  }

  private sfxPlayer(name: SfxName): AudioPlayer {
    let player = this.sfxPlayers.get(name);
    if (!player) {
      player = createAudioPlayer(SFX_SOURCES[name]);
      this.sfxPlayers.set(name, player);
    }
    return player;
  }

  private musicPlayer(name: MusicName): AudioPlayer {
    let player = this.musicPlayers.get(name);
    if (!player) {
      player = createAudioPlayer(MUSIC_SOURCES[name]);
      player.loop = true;
      player.volume = 0;
      this.musicPlayers.set(name, player);
    }
    return player;
  }

  preload() {
    (Object.keys(SFX_SOURCES) as SfxName[]).forEach((name) => this.sfxPlayer(name));
  }

  play(name: SfxName, volume = 1) {
    if (!this.sfxEnabled || !this.unlocked) return;
    try {
      const player = this.sfxPlayer(name);
      player.volume = volume;
      player.seekTo(0);
      player.play();
    } catch {}
  }

  setAmbient(on: boolean) {
    this.ambientOn = on;
    if (!this.unlocked) return;
    try {
      if (!this.ambient) {
        this.ambient = createAudioPlayer(SFX_SOURCES.waves);
        this.ambient.loop = true;
      }
      this.ambient.volume = AMBIENT_VOLUME;
      if (on && this.sfxEnabled) this.ambient.play();
      else this.ambient.pause();
    } catch {}
  }

  setMusic(name: MusicName | null) {
    this.wanted = name;
    if (!this.unlocked || name === this.current) return;
    const next = name && this.musicEnabled ? this.musicPlayer(name) : null;
    this.current = name;
    if (next) {
      next.volume = 0;
      next.play();
    }
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    const started = Date.now();
    const others = [...this.musicPlayers.entries()].filter(([key, p]) => p !== next && key !== name).map(([, p]) => p);
    this.fadeTimer = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / FADE_MS);
      try {
        if (next) next.volume = MUSIC_VOLUME * t;
        for (const p of others) p.volume = Math.min(p.volume, MUSIC_VOLUME * (1 - t));
        if (t >= 1) {
          for (const p of others) p.pause();
          if (this.fadeTimer) clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
      } catch {}
    }, 50);
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    const wanted = this.wanted;
    this.current = null;
    if (!enabled) {
      for (const p of this.musicPlayers.values()) p.pause();
      this.wanted = wanted;
      return;
    }
    this.setMusic(wanted);
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.setAmbient(this.ambientOn);
  }

  pauseAll() {
    for (const p of this.musicPlayers.values()) p.pause();
    this.ambient?.pause();
  }

  resume() {
    const wanted = this.wanted;
    this.current = null;
    this.setMusic(wanted);
    this.setAmbient(this.ambientOn);
  }
}

export const audio = new AudioManager();
