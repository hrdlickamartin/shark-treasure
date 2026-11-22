import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audio, type MusicName } from './audio/audio';
import { MAX_HEALTH, PX_PER_M } from './game/constants';
import { createGame, newWorld, step } from './game/engine';
import { REGIONS } from './game/regions';
import { startDive, triggerSonar } from './game/systems/dive';
import type { GameEvent, GameState, Input } from './game/types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import { activeMissions } from './progression/missions';
import { statsFor, type UpgradeId } from './progression/upgrades';
import { type ResultSummary, useProgress } from './progression/useProgress';
import { Preloader } from './render/Preloader';
import { Icon } from './render/Sprite';
import { World } from './render/World';
import { GameButton } from './ui/Button';
import { DiveSummary } from './ui/DiveSummary';
import { ThrottledHUD } from './ui/HUD';
import { Joystick } from './ui/Joystick';
import { MainMenu } from './ui/MainMenu';
import { TouchAction } from './ui/TouchAction';
import { Missions } from './ui/Missions';
import { PauseMenu } from './ui/PauseMenu';
import { Settings } from './ui/Settings';
import { COLORS, FONTS, textShadow } from './ui/theme';
import { UpgradeShop } from './ui/UpgradeShop';

type Screen = 'menu' | 'play' | 'summary' | 'shop' | 'missions' | 'settings' | 'paused';

const noop = () => {};

interface Toast {
  text: string;
  until: number;
}

export function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const zoom = Math.max(0.6, Math.min(1, Math.min(width, height) / 560));
  const view = { width: width / zoom, height: height / zoom };
  const viewRef = useRef(view);
  viewRef.current = view;
  const progress = useProgress();
  const { save, loaded } = progress;
  const gameRef = useRef<GameState | null>(null);
  const joystickRef = useRef<Input>({ x: 0, y: 0 });
  const [screen, setScreen] = useState<Screen>('menu');
  const [returnTo, setReturnTo] = useState<Screen>('menu');
  const [summary, setSummary] = useState<ResultSummary | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [appActive, setAppActive] = useState(true);
  const [, setFrame] = useState(0);
  const frameRef = useRef(0);
  const perfRef = useRef({ avg: 1 / 60, every: 1 });
  const ambientRef = useRef(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  if (loaded && !gameRef.current) gameRef.current = createGame(statsFor(save.upgrades), view);

  useEffect(() => {
    audio.init();
    audio.preload();
  }, []);

  useEffect(() => {
    audio.setMusicEnabled(save.settings.music);
    audio.setSfxEnabled(save.settings.sfx);
  }, [save.settings.music, save.settings.sfx]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.stats = statsFor(save.upgrades);
    if (game.phase !== 'dive') game.diver.oxygen = game.stats.oxygenMax;
  }, [save.upgrades]);

  const showToast = useCallback((text: string, seconds = 2.6) => setToast({ text, until: Date.now() + seconds * 1000 }), []);

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const e of events) {
        if (e.type === 'sfx') audio.play(e.name, e.volume);
        else if (e.type === 'haptic') {
          if (!save.settings.haptics || Platform.OS === 'web') continue;
          if (e.kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          else if (e.kind === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          else if (e.kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } else if (e.type === 'finished') {
          setSummary(progress.applyResult(e.result));
          setScreen('summary');
        } else if (e.type === 'locked') {
          const next = REGIONS[(gameRef.current?.stats.boatLevel ?? 0) + 1];
          if (next) showToast(`${next.name} je zamčená – vylepši loď`);
        }
      }
    },
    [progress, save.settings.haptics, showToast],
  );

  const pickMusic = (game: GameState, current: Screen): MusicName => {
    if (current === 'menu' || current === 'missions' || current === 'settings') return 'menu';
    if (current === 'shop') return 'shop';
    if (game.phase === 'dive' && game.diver.y / PX_PER_M > 45) return 'deep';
    if (game.phase === 'dive') return 'shallow';
    return 'menu';
  };

  const actionRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const keyboardRef = useKeyboard(
    () => actionRef.current(),
    () => pauseRef.current(),
  );

  const running = loaded && appActive && screen !== 'paused' && !(screen === 'settings' && returnTo === 'paused');

  useGameLoop((dt) => {
    const game = gameRef.current;
    if (!game) return;
    const keyboard = keyboardRef.current;
    const playing = screenRef.current === 'play';
    const input: Input = !playing ? { x: 0, y: 0 } : keyboard.x !== 0 || keyboard.y !== 0 ? keyboard : joystickRef.current;
    const events = step(game, input, dt, viewRef.current);
    if (events.length) handleEvents(events);
    audio.setMusic(pickMusic(game, screenRef.current));
    const nearSurface = game.camera.y < 140;
    if (nearSurface !== ambientRef.current) {
      ambientRef.current = nearSurface;
      audio.setAmbient(nearSurface);
    }
    frameRef.current += 1;
    const perf = perfRef.current;
    if (dt > 0 && dt < 0.25) perf.avg = perf.avg * 0.95 + dt * 0.05;
    if (perf.every === 1 && perf.avg > 0.026) perf.every = 2;
    else if (perf.every === 2 && perf.avg < 0.018) perf.every = 1;
    if (frameRef.current % perf.every === 0 || events.length > 0) setFrame((f) => (f + 1) % 1000000);
  }, running);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      const active = status === 'active';
      setAppActive(active);
      if (!active) {
        audio.pauseAll();
        if (screenRef.current === 'play') setScreen('paused');
      } else audio.resume();
    });
    let removeWeb: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibility = () => {
        if (document.hidden && screenRef.current === 'play') setScreen('paused');
      };
      document.addEventListener('visibilitychange', onVisibility);
      removeWeb = () => document.removeEventListener('visibilitychange', onVisibility);
    }
    return () => {
      sub.remove();
      removeWeb?.();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), Math.max(0, toast.until - Date.now()));
    return () => clearTimeout(id);
  }, [toast]);

  const action = useCallback(() => {
    const game = gameRef.current;
    if (!game || screenRef.current !== 'play') return;
    if (game.phase === 'boat') {
      startDive(game);
      if (!save.tutorialSeen) {
        showToast('Najdi truhlici a dopluj s ní zpět k lodi!', 4);
        progress.markTutorial();
      }
    } else if (game.phase === 'dive') triggerSonar(game);
  }, [progress, save.tutorialSeen, showToast]);

  const togglePause = useCallback(() => {
    const current = screenRef.current;
    if (current === 'play') setScreen('paused');
    else if (current === 'paused') setScreen('play');
  }, []);

  useEffect(() => {
    actionRef.current = action;
    pauseRef.current = togglePause;
  }, [action, togglePause]);

  if (!loaded || !gameRef.current) return <View style={styles.loading} />;
  const game = gameRef.current;

  const play = () => {
    audio.unlock();
    setScreen('play');
  };

  const buy = (id: UpgradeId) => {
    if (progress.buy(id)) audio.play('buy');
  };

  const continueAfterSummary = () => {
    gameRef.current = newWorld(game, view);
    setSummary(null);
    setScreen('play');
  };

  const openShopFromSummary = () => {
    gameRef.current = newWorld(game, view);
    setSummary(null);
    setReturnTo('play');
    setScreen('shop');
  };

  const quitFromPause = () => {
    if (game.phase === 'dive' && game.diver.state === 'diving') {
      game.diver.health = 0;
      game.lastDamage = game.lastDamage ?? 'oxygen';
      setScreen('play');
    } else setScreen('menu');
  };

  const diving = game.phase === 'dive';
  const onBoat = game.phase === 'boat';
  const showControls = screen === 'play';
  const joySize = Math.min(150, Math.max(110, Math.min(width, height) * 0.3));
  const sonarReady = game.sonarCooldown <= 0;

  return (
    <View style={styles.root} onTouchStart={() => audio.unlock()}>
      <Preloader />
      <View style={[styles.worldLayer, { width: view.width, height: view.height, transform: [{ scale: zoom }] }]} pointerEvents="none">
        <World state={game} view={view} />
      </View>

      {(screen === 'play' || screen === 'paused') && (
        <ThrottledHUD
          tick={screen === 'paused' ? -1 : Math.floor(frameRef.current / 3)}
          state={game}
          narrow={width < 640}
          money={save.money}
          topInset={insets.top}
          leftInset={insets.left}
          rightInset={insets.right}
          onPause={togglePause}
        />
      )}

      {showControls && (
        <>
          <Joystick size={joySize} inputRef={joystickRef} left={insets.left + 22} bottom={insets.bottom + 22} />
          {onBoat && (
            <View style={[styles.boatPanel, { right: insets.right + 20, bottom: insets.bottom + 22 }]}>
              <View style={styles.boatButtons}>
                <GameButton size="sm" variant="blue" icon={<Icon name="icon_tank" size={20} />} label="Vylepšení" onPress={() => { setReturnTo('play'); setScreen('shop'); }} />
                <GameButton size="sm" variant="blue" icon={<Icon name="icon_trophy" size={20} />} label="Mise" onPress={() => { setReturnTo('play'); setScreen('missions'); }} />
              </View>
              <TouchAction onFire={action}>
                <GameButton label="PONOŘIT SE" size="lg" onPress={noop} silent />
              </TouchAction>
              <Text style={styles.boatHint}>Pluj lodí ◀ ▶ a vyber místo ponoru</Text>
            </View>
          )}
          {diving && game.stats.sonarRange > 0 && (
            <View style={[styles.sonarWrap, { right: insets.right + 26, bottom: insets.bottom + 30 }]}>
              <TouchAction onFire={action} disabled={!sonarReady}>
                <GameButton variant={sonarReady ? 'green' : 'navy'} icon={<Icon name="icon_sonar" size={44} />} onPress={noop} silent />
              </TouchAction>
              <Text style={styles.sonarText}>{sonarReady ? 'SONAR' : `${Math.ceil(game.sonarCooldown)} s`}</Text>
            </View>
          )}
          {diving && game.diver.health < MAX_HEALTH * 0.3 && game.diver.state === 'diving' && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hurtVignette]} />
          )}
        </>
      )}

      {screen === 'play' && diving && game.diver.state === 'diving' && game.diver.oxygen / game.stats.oxygenMax < 0.25 && (
        <View style={[styles.warning, { top: height * 0.3 }]} pointerEvents="none">
          <Text style={[styles.warningText, { opacity: Math.floor(game.time * 4) % 2 === 0 ? 0.45 : 1 }]}>
            {game.diver.oxygen <= 0 ? 'DOŠEL KYSLÍK!' : 'MÁLO KYSLÍKU – VRAŤ SE!'}
          </Text>
        </View>
      )}

      {toast && (
        <View style={[styles.toast, { top: insets.top + (screen === 'play' ? 96 : 20) }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      )}

      {screen === 'menu' && (
        <MainMenu
          money={save.money}
          width={width}
          height={height}
          onPlay={play}
          onShop={() => { audio.unlock(); setReturnTo('menu'); setScreen('shop'); }}
          onMissions={() => { audio.unlock(); setReturnTo('menu'); setScreen('missions'); }}
          onSettings={() => { audio.unlock(); setReturnTo('menu'); setScreen('settings'); }}
          missionsAvailable={activeMissions(save.missionsDone).length}
        />
      )}
      {screen === 'summary' && summary && (
        <DiveSummary summary={summary} onContinue={continueAfterSummary} onShop={openShopFromSummary} maxHeight={height} />
      )}
      {screen === 'shop' && (
        <UpgradeShop money={save.money} levels={save.upgrades} onBuy={buy} onClose={() => setScreen(returnTo)} width={width} height={height} />
      )}
      {screen === 'missions' && <Missions save={save} onClose={() => setScreen(returnTo)} height={height} />}
      {screen === 'settings' && (
        <Settings settings={save.settings} onChange={progress.updateSettings} onReset={() => { progress.reset(); gameRef.current = null; setScreen('menu'); }} onClose={() => setScreen(returnTo)} />
      )}
      {screen === 'paused' && (
        <PauseMenu
          diving={diving}
          onResume={() => setScreen('play')}
          onSettings={() => { setReturnTo('paused'); setScreen('settings'); }}
          onQuit={quitFromPause}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.deep, overflow: 'hidden' },
  loading: { flex: 1, backgroundColor: COLORS.deep },
  worldLayer: { position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' },
  boatPanel: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
  boatButtons: { flexDirection: 'row', gap: 8 },
  boatHint: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, ...textShadow },
  sonarWrap: { position: 'absolute', alignItems: 'center', gap: 2 },
  sonarText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 13, ...textShadow },
  warning: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  warningText: { color: COLORS.coral, fontFamily: FONTS.title, fontSize: 26, textAlign: 'center', ...textShadow },
  hurtVignette: { borderWidth: 10, borderColor: 'rgba(255, 60, 90, 0.35)' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(8, 43, 89, 0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  toastText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 16, textAlign: 'center', ...textShadow },
});
