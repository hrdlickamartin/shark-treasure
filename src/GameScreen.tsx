import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audio, type MusicName } from './audio/audio';
import { MAX_HEALTH, PX_PER_M } from './game/constants';
import { createGame, newWorld, step, type WorldOptions } from './game/engine';
import { SHAFT_UNLOCK_M } from './game/endless';
import { OCEAN_ORDER, OCEANS, reefShift, weekIndex, WORLD_OCEANS, type OceanId } from './game/oceans';
import { pipKey } from './game/systems/drone';
import { cycleKit, applyKit } from './game/systems/kit';
import { SLOTS, MODULES } from './progression/modules';
import { activeModules, equippedModules, expansionOn, huntProps, riftProps, weeklyOcean, weeklySeed } from './progression/tides';
import { Port } from './ui/Port';
import { discountFor } from './progression/factions';
import { Modes } from './ui/Modes';
import { CollapseFrame } from './ui/CollapseFrame';
import { CHALLENGES, CONDITIONS, challengeFor, todayKey } from './game/modifiers';
import { startDive, triggerSonar } from './game/systems/dive';
import { cameraKey, fireHarpoon, fireRepellent, fireScooter, healDiver, launchBalloon, takePhoto, toggleCamera } from './game/systems/extras';
import { objectiveProps } from './game/systems/props';
import type { ChallengeId, GameEvent, GameState, Input, GameVariant } from './game/types';
import { Live, nextFrame } from './hooks/useFrame';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import { useGamepad, type PadButton } from './hooks/useGamepad';
import { activeQuests, CHAPTER_COUNT, photoMatches, questProps } from './progression/quests';
import { photoMessage } from './progression/encyclopedia';
import type { SaveData, TideEnding } from './progression/saveData';
import type { Line } from './progression/characters';
import { dialogueFor, radioLine, type Dialogue } from './progression/dialogue';
import { choiceAvailable } from './progression/progress';
import { DialogueBox, RadioBubble } from './ui/Dialogue';
import { statsFor, type UpgradeId } from './progression/upgrades';
import { type ResultSummary, useProgress } from './progression/useProgress';
import { Preloader } from './render/Preloader';
import type { BackgroundName } from './render/spriteAssets';
import { Icon } from './render/Sprite';
import { World } from './render/World';
import { GameButton } from './ui/Button';
import { actionsWidth, DiveActions } from './ui/DiveActions';
import { DiveSummary } from './ui/DiveSummary';
import { Expedition } from './ui/Expedition';
import { Ending } from './ui/Ending';
import { Logbook } from './ui/Logbook';
import { WorldMap } from './ui/WorldMap';
import { ThrottledHUD } from './ui/HUD';
import { Joystick } from './ui/Joystick';
import { MainMenu } from './ui/MainMenu';
import { TouchAction } from './ui/TouchAction';
import { PauseMenu } from './ui/PauseMenu';
import { Settings } from './ui/Settings';
import { COLORS, FONTS, textShadow } from './ui/theme';
import { UpgradeShop } from './ui/UpgradeShop';

type Screen = 'menu' | 'play' | 'summary' | 'shop' | 'settings' | 'paused' | 'expedition' | 'worldmap' | 'logbook' | 'ending' | 'port' | 'modes';

const noop = () => {};

const PRELOAD = Object.fromEntries(WORLD_OCEANS.map((id) => [id, OCEANS[id].backgrounds.map((b) => b.name)])) as Record<OceanId, BackgroundName[]>;

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
  const [merchant, setMerchant] = useState(false);
  const [radio, setRadio] = useState<{ line: Line; until: number } | null>(null);
  const radioRef = useRef<Record<string, number>>({ any: 0 });
  const heldDialog = useRef<Dialogue | null>(null);
  const questsRef = useRef<SaveData['quests'] | null>(null);
  const [appActive, setAppActive] = useState(true);
  const [, setFrame] = useState(0);
  const frameRef = useRef(0);
  const perfRef = useRef({ avg: 1 / 60, every: 1 });
  const ambientRef = useRef(false);
  const phaseRef = useRef<GameState['phase'] | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const optionsFor = (challenge: ChallengeId | null): WorldOptions => ({
    ownedRelics: save.relics,
    skin: save.skin,
    challenge,
    calm: save.stats.dives < 3,
    shaftBest: save.shaftBest,
    ocean: save.ocean,
    props: [...questProps(save.quests, save.oceans, save.flags, save.ocean), ...riftProps(save, save.ocean), ...huntProps(save, save.ocean)],
    supplies: save.supplies,
    expansion: expansionOn(save),
    kit: save.kit,
    tideScale: save.settings.slowTide ? 1.5 : 1,
    reduceMotion: save.settings.reduceMotion,
    rarityShapes: save.settings.rarityShapes,
    boatDecor: Object.entries(activeModules(save)).map(([slot, id]) => {
      const spot = SLOTS.find((sl) => sl.id === slot)!;
      return { slot, sprite: MODULES[id!].sprite, x: spot.x, y: spot.y, width: spot.width };
    }),
  });
  const meta = { expedition: save.expedition, perks: save.perks, research: save.research, mods: save.mods.equipped, modules: activeModules(save), tideEnding: save.tideEnding };
  const startX = () => (OCEANS[save.ocean].moving ? reefShift(save.stats.dives) : 0);
  const statsWith = (challenge: ChallengeId | null) => statsFor(save.upgrades, save.relics, challenge, meta);
  if (loaded && !gameRef.current) gameRef.current = createGame(statsWith(null), view, startX(), optionsFor(null));
  if (loaded && questsRef.current !== save.quests) {
    const current = gameRef.current;
    if (questsRef.current && current && current.phase === 'boat' && current.mode === 'sea' && screen === 'play') gameRef.current = newWorld(current, view, statsWith(current.challenge), optionsFor(current.challenge));
    questsRef.current = save.quests;
  }
  const tideChoice = save.flags.find((f) => f.startsWith('tide_end:'))?.slice(9) as TideEnding | undefined;
  const endingPending = (save.storyChapter >= CHAPTER_COUNT && !save.ending) || (!!tideChoice && !save.tideEnding);
  const todaysChallenge = save.challengeDone === todayKey() ? null : challengeFor(todayKey());

  const dialogOpen = save.pendingDialogs.length > 0;
  useEffect(() => {
    if (endingPending && screen === 'play' && gameRef.current?.phase === 'boat' && !dialogOpen && !heldDialog.current) setScreen('ending');
  }, [endingPending, screen, dialogOpen]);

  useEffect(() => {
    audio.init();
    audio.preload();
  }, []);

  useEffect(() => {
    audio.setMusicEnabled(save.settings.music);
    audio.setSfxEnabled(save.settings.sfx);
  }, [save.settings.music, save.settings.sfx]);

  const boatModules = useMemo(() => equippedModules(save.upgrades.boat, save.modules.equipped), [save.upgrades.boat, save.modules.equipped]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.stats = statsFor(save.upgrades, save.relics, game.challenge, { expedition: save.expedition, perks: save.perks, research: save.research, mods: save.mods.equipped, modules: boatModules, tideEnding: save.tideEnding });
    game.ownedRelics = save.relics;
    game.skin = save.skin;
    if (game.phase !== 'dive') game.diver.oxygen = game.stats.oxygenMax;
  }, [save.upgrades, save.relics, save.skin, save.expedition, save.perks, save.research, save.mods.equipped, boatModules, save.tideEnding]);

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
        } else if (e.type === 'toast') {
          showToast(e.text, 3);
        } else if (e.type === 'cargo') {
          progress.addMoney(e.value);
          showToast(`Vylovil jsi náklad: +${e.value} $`);
        } else if (e.type === 'radio') {
          const now = Date.now();
          const urgent = e.topic === 'quest_item' || e.topic === 'echo' || e.topic === 'boss';
          const last = radioRef.current;
          if (now - last.any < (urgent ? 2500 : 9000) || now - (last[e.topic] ?? 0) < (urgent ? 2500 : 25000)) continue;
          const line = radioLine(e.topic, now / 1000);
          if (!line) continue;
          last.any = now;
          last[e.topic] = now;
          setRadio({ line, until: now + 4200 });
        } else if (e.type === 'photo') {
          const quest = e.species ? activeQuests(save.quests, save.oceans, save.flags).find((q) => q.ocean === save.ocean && q.steps.some((g) => g.kind === 'photo' && photoMatches(g.species, e.species))) : undefined;
          showToast(photoMessage(save.encyclopedia, e.species, e.stars, e.prev, quest?.title ?? null), 3.2);
        } else if (e.type === 'merchant') {
          setMerchant(true);
        } else if (e.type === 'bottle') {
          progress.foundBottle();
          showToast(`Útržek mapy pokladu! (${Math.min(3, save.hunt.pieces + 1)}/3)`);
        } else if (e.type === 'locked') {
          showToast('Tady mapa končí – další oceány najdeš na mapě světa');
        }
      }
    },
    [progress, save.settings.haptics, save.encyclopedia, save.quests, save.oceans, save.flags, save.ocean, save.hunt.pieces, showToast],
  );

  const pickMusic = (game: GameState, current: Screen): MusicName => {
    if (current === 'menu' || current === 'settings' || current === 'expedition' || current === 'worldmap' || current === 'logbook' || current === 'ending') return 'menu';
    if (current === 'shop') return 'shop';
    if (game.phase === 'dive' && game.diver.y / PX_PER_M > 45) return 'deep';
    if (game.phase === 'dive') return 'shallow';
    return 'menu';
  };

  const actionRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const keyRef = useRef<(code: string) => void>(() => {});
  const keyboardRef = useKeyboard(
    () => actionRef.current(),
    () => pauseRef.current(),
    (code) => keyRef.current(code),
  );

  const running = loaded && appActive && screen !== 'paused' && !(screen === 'settings' && returnTo === 'paused');

  const readPad = useGamepad();
  const padRef = useRef<(button: PadButton) => void>(() => {});

  useGameLoop((dt) => {
    const game = gameRef.current;
    if (!game) return;
    const keyboard = keyboardRef.current;
    const playing = screenRef.current === 'play';
    const pad = readPad();
    for (const button of pad.pressed) padRef.current(button);
    const input: Input = !playing ? { x: 0, y: 0 } : keyboard.x !== 0 || keyboard.y !== 0 ? keyboard : pad.input.x !== 0 || pad.input.y !== 0 ? pad.input : joystickRef.current;
    const events = step(game, input, dt, viewRef.current);
    if (events.length) handleEvents(events);
    audio.setMusic(pickMusic(game, screenRef.current));
    audio.setBiome(game.phase === 'dive' && screenRef.current === 'play' ? (game.ocean === 'riptide' ? 'riptide' : game.ocean === 'wandering' ? 'reef' : null) : null);
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
    if (frameRef.current % perf.every === 0 || events.length > 0) nextFrame();
    if (game.phase !== phaseRef.current) {
      phaseRef.current = game.phase;
      setFrame((f) => (f + 1) % 1000000);
    }
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
    if (!radio) return;
    const id = setTimeout(() => setRadio(null), Math.max(0, radio.until - Date.now()));
    return () => clearTimeout(id);
  }, [radio]);

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

  const onKey = useCallback((code: string) => {
    const game = gameRef.current;
    if (!game || screenRef.current !== 'play') return;
    if (code === 'KeyB') launchBalloon(game);
    if (code === 'KeyR') fireRepellent(game);
    if (code === 'KeyH') healDiver(game);
    if (code === 'KeyF') fireScooter(game);
    if (code === 'KeyE') fireHarpoon(game);
    if (code === 'KeyC') cameraKey(game);
    if (code === 'KeyG') pipKey(game);
    if (code === 'KeyQ') applyKit(game);
    if (code === 'KeyX') cycleKit(game);
  }, []);

  const onPad = useCallback(
    (button: PadButton) => {
      if (button === 'pause') return togglePause();
      if (button === 'action') return action();
      const codes: Partial<Record<PadButton, string>> = { balloon: 'KeyB', harpoon: 'KeyE', pip: 'KeyG', kit: 'KeyQ', cycle: 'KeyX', camera: 'KeyC', medkit: 'KeyH', scooter: 'KeyF' };
      const code = codes[button];
      if (code) onKey(code);
    },
    [action, togglePause, onKey],
  );

  useEffect(() => {
    actionRef.current = action;
    pauseRef.current = togglePause;
    keyRef.current = onKey;
    padRef.current = onPad;
  }, [action, togglePause, onKey, onPad]);

  if (!loaded || !gameRef.current) return <View style={styles.loading} />;
  const game = gameRef.current;

  const play = () => {
    audio.unlock();
    setScreen('play');
  };

  const buy = (id: UpgradeId) => {
    if (progress.buy(id)) audio.play('buy');
  };

  const freshWorld = (challenge: ChallengeId | null) => newWorld(game, view, statsWith(challenge), optionsFor(challenge));

  const continueAfterSummary = () => {
    gameRef.current = freshWorld(null);
    setSummary(null);
    setScreen(endingPending ? 'ending' : 'play');
  };

  const travelTo = (ocean: OceanId) => {
    audio.unlock();
    if (ocean !== save.ocean) {
      if (!progress.travel(ocean)) return;
      gameRef.current = null;
      showToast(`Vyplouváš: ${OCEANS[ocean].czech} – ${OCEANS[ocean].port}`, 3);
    }
    setScreen('play');
  };

  const dialog = heldDialog.current ?? (save.pendingDialogs.length ? dialogueFor(save.pendingDialogs[0]) : null);
  const merchantPrice = 300 + OCEAN_ORDER.indexOf(save.ocean) * 150;

  const boatHint = (g: GameState) => {
    const target = !save.settings.markers ? null : objectiveProps(g).reduce<{ x: number } | null>((best, p) => (!best || Math.abs(p.x - g.boat.x) < Math.abs(best.x - g.boat.x) ? p : best), null);
    if (target) return `Cíl úkolu: ${Math.round(Math.abs(target.x - g.boat.x) / PX_PER_M)} m ${target.x > g.boat.x ? 'vpravo' : 'vlevo'}`;
    if (g.mode === 'endless') return `Hlubinný ponor – rekord ${save.shaftBest} m. Mince se vyplatí vždy.`;
    if (g.condition !== 'normal') return `${CONDITIONS[g.condition].name}: ${CONDITIONS[g.condition].description}`;
    return `${OCEANS[g.ocean].port} – pluj lodí ◀ ▶ a vyber místo ponoru`;
  };

  const shaftLocked = save.stats.bestDepth < SHAFT_UNLOCK_M && save.shaftBest === 0;

  const startShaft = () => {
    if (shaftLocked) return;
    audio.unlock();
    gameRef.current = createGame(statsWith(null), view, 0, { ...optionsFor(null), mode: 'endless', ocean: 'abyss', props: [], condition: 'normal' });
    showToast('Hlubinný ponor: jak hluboko se dostaneš? Sbírej kyslíkové bubliny.', 4);
    setScreen('play');
  };

  const startMode = (variant: GameVariant, ocean?: OceanId) => {
    audio.unlock();
    const week = weekIndex();
    const target = variant === 'weekly' ? weeklyOcean(save, week) : (ocean ?? save.ocean);
    const options = { ...optionsFor(null), variant, ocean: target, props: variant === 'normal' ? optionsFor(null).props : [] };
    if (variant === 'weekly') {
      const conditions = ['normal', 'night', 'storm', 'gold'] as const;
      options.seed = weeklySeed(week);
      options.condition = conditions[week % conditions.length];
    }
    gameRef.current = createGame(statsWith(null), view, 0, options);
    const label = variant === 'free' ? 'Volný průzkum: bez kyslíkového limitu, jen fotky a mapování.' : variant === 'weekly' ? `Týdenní expedice: ${OCEANS[target].czech}, stejný svět pro všechny.` : `Legendární expedice: odveta v oceánu ${OCEANS[target].czech}. Boss čeká hned za útesem.`;
    showToast(label, 4);
    setScreen('play');
  };

  const startChallenge = () => {
    if (!todaysChallenge) return;
    audio.unlock();
    gameRef.current = freshWorld(todaysChallenge);
    showToast(`Výzva dne: ${CHALLENGES[todaysChallenge].name} – ${CHALLENGES[todaysChallenge].description}`, 4);
    setScreen('play');
  };

  const openShopFromSummary = () => {
    gameRef.current = freshWorld(null);
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
  const preloadBackgrounds = PRELOAD[game.ocean];
  const onBoat = game.phase === 'boat';
  const showControls = screen === 'play';
  const compactUi = Math.min(width, height) < 520;
  const portrait = height > width;
  const dive = (
    <>
      <TouchAction onFire={action}>
        <GameButton label="PONOŘIT SE" size={compactUi ? 'md' : 'lg'} onPress={noop} silent />
      </TouchAction>
      <Live>{() => <Text style={styles.boatHint}>{boatHint(gameRef.current ?? game)}</Text>}</Live>
    </>
  );
  const joySize = Math.min(150, Math.max(110, Math.min(width, height) * 0.3));

  return (
    <View style={styles.root} onTouchStart={() => audio.unlock()}>
      <Preloader backgrounds={preloadBackgrounds} />
      <View style={[styles.worldLayer, { width: view.width, height: view.height, transform: [{ scale: zoom }] }]} pointerEvents="none">
        <Live>{() => <World state={gameRef.current ?? game} view={view} />}</Live>
      </View>

      {(screen === 'play' || screen === 'paused') && (
        <Live>
          {() => (
            <ThrottledHUD
              tick={screen === 'paused' ? -1 : Math.floor(frameRef.current / 3)}
              state={gameRef.current ?? game}
              narrow={width < 640}
              money={save.money}
              topInset={insets.top}
              leftInset={insets.left}
              rightInset={insets.right}
              markers={save.settings.markers}
              onPause={togglePause}
            />
          )}
        </Live>
      )}

      {showControls && (
        <>
          <Joystick size={joySize} inputRef={joystickRef} left={insets.left + 22} bottom={insets.bottom + 22} />
          {onBoat && (
            <>
              <View
                pointerEvents="box-none"
                style={portrait ? [styles.boatRowPortrait, { left: insets.left + 12, right: insets.right + 12, bottom: insets.bottom + 22 + joySize + 14 }] : [styles.boatPanel, { right: insets.right + 20, bottom: insets.bottom + 22 }]}
              >
                <View pointerEvents="box-none" style={[styles.boatButtons, portrait && styles.boatButtonsWrap]}>
                  <GameButton size={compactUi ? 'xs' : 'sm'} variant="blue" icon={<Icon name="icon_tank" size={20} />} label="Vylepšení" onPress={() => { setReturnTo('play'); setScreen('shop'); }} />
                  <GameButton size={compactUi ? 'xs' : 'sm'} variant="blue" icon={<Icon name="icon_story" size={20} />} label="Deník" onPress={() => { setReturnTo('play'); setScreen('logbook'); }} />
                  <GameButton size={compactUi ? 'xs' : 'sm'} variant="blue" icon={<Icon name="icon_map" size={20} />} label="Mapa" onPress={() => { setReturnTo('play'); setScreen('worldmap'); }} />
                  {expansionOn(save) && <GameButton size={compactUi ? 'xs' : 'sm'} variant="gold" icon={<Icon name="icon_port" size={20} />} label="Přístav" onPress={() => { setReturnTo('play'); setScreen('port'); }} />}
                </View>
                {todaysChallenge && !game.challenge && game.mode === 'sea' && (
                  <GameButton size={compactUi ? 'xs' : 'sm'} variant="gold" icon={<Icon name="icon_calendar" size={20} />} label={`Výzva dne ×${CHALLENGES[todaysChallenge].reward.toLocaleString('cs-CZ')}`} onPress={startChallenge} />
                )}
                {!portrait && dive}
              </View>
              {portrait && (
                <View pointerEvents="box-none" style={[styles.boatPanel, { right: insets.right + 20, bottom: insets.bottom + 22, left: insets.left + 22 + joySize + 12 }]}>
                  {dive}
                </View>
              )}
            </>
          )}
          {diving && (
            <Live>
              {() => {
                const live = gameRef.current ?? game;
                return (
                  <>
                    <DiveActions
                      state={live}
                      right={insets.right + 10}
                      bottom={insets.bottom + 10}
                      onSonar={action}
                      onBalloon={() => launchBalloon(live)}
                      onRepellent={() => fireRepellent(live)}
                      onMedkit={() => healDiver(live)}
                      onScooter={() => fireScooter(live)}
                      onHarpoon={() => fireHarpoon(live)}
                      onCamera={() => toggleCamera(live)}
                      onShutter={() => takePhoto(live)}
                      onPip={() => pipKey(live)}
                      onKit={() => applyKit(live)}
                      onKitCycle={() => cycleKit(live)}
                    />
                    {live.collapse && <CollapseFrame time={live.collapse.time} reduceMotion={live.reduceMotion} />}
                    {live.diver.health < MAX_HEALTH * 0.3 && live.diver.state === 'diving' && (
                      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.hurtVignette]} />
                    )}
                    {live.diver.state === 'diving' && live.diver.oxygen / live.stats.oxygenMax < 0.25 && (
                      <View style={[styles.warning, { top: height * 0.3 }]} pointerEvents="none">
                        <Text style={[styles.warningText, { opacity: Math.floor(live.time * 4) % 2 === 0 ? 0.45 : 1 }]}>
                          {live.diver.oxygen <= 0 ? 'DOŠEL KYSLÍK!' : 'MÁLO KYSLÍKU – VRAŤ SE!'}
                        </Text>
                      </View>
                    )}
                  </>
                );
              }}
            </Live>
          )}
        </>
      )}

      {radio && screen === 'play' && (gameRef.current ?? game).phase === 'dive' && (
        <RadioBubble
          line={radio.line}
          width={width > height ? Math.min(420, width - insets.left - insets.right - 170 - actionsWidth(width, height)) + 32 : width}
          left={width > height ? insets.left + 160 : undefined}
          top={width > height ? undefined : insets.top + 175}
          bottom={width > height ? insets.bottom + 12 : undefined}
          big={save.settings.bigText}
        />
      )}

      {dialog && screen === 'play' && game.phase === 'boat' && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.dialogShade} />
          <DialogueBox
            key={dialog.id}
            dialogue={dialog}
            width={width}
            bottom={insets.bottom + 16}
            money={save.money}
            big={save.settings.bigText}
            canChoose={(needs) => choiceAvailable(save, needs)}
            onChoose={(option) => {
              if (!dialog.choice) return null;
              heldDialog.current = dialog;
              const result = progress.choose(dialog.choice.quest, option);
              if (!result) heldDialog.current = null;
              return result;
            }}
            onDone={() => {
              heldDialog.current = null;
              progress.dismissDialog(dialog.id);
            }}
          />
        </View>
      )}

      {toast && (
        <View style={[styles.toast, { top: insets.top + (screen === 'play' ? 150 : 20) }]} pointerEvents="none">
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
          onSettings={() => { audio.unlock(); setReturnTo('menu'); setScreen('settings'); }}
          onLogbook={() => { audio.unlock(); setReturnTo('menu'); setScreen('logbook'); }}
          onWorldMap={() => { audio.unlock(); setReturnTo('menu'); setScreen('worldmap'); }}
          oceanName={OCEANS[save.ocean].czech}
          onExpedition={() => { audio.unlock(); setReturnTo('menu'); setScreen('expedition'); }}
          onShaft={startShaft}
          shaftLocked={shaftLocked}
          shaftBest={save.shaftBest}
          expedition={save.expedition}
          onChallenge={startChallenge}
          onModes={() => { audio.unlock(); setReturnTo('menu'); setScreen('modes'); }}
          modesOpen={expansionOn(save)}
          challengeName={todaysChallenge ? CHALLENGES[todaysChallenge].name : null}
        />
      )}
      {screen === 'summary' && summary && (
        <DiveSummary summary={summary} onContinue={continueAfterSummary} onShop={openShopFromSummary} maxHeight={height} pendingShards={save.shards.pending} onHandOver={(f) => { if (progress.handOver(f)) audio.play('buy'); }} />
      )}
      {screen === 'shop' && (
        <UpgradeShop
          money={save.money}
          levels={save.upgrades}
          expedition={save.expedition}
          discount={discountFor(save.reputation, 'guild')}
          onBuy={buy}
          onBuySkin={(id) => {
            if (progress.buySkin(id)) audio.play('buy');
          }}
          skins={save.skins}
          skin={save.skin}
          onClose={() => setScreen(returnTo)}
          width={width}
          height={height}
        />
      )}
      {screen === 'expedition' && (
        <Expedition
          save={save}
          height={height}
          width={width}
          onBuyPerk={(id) => {
            if (progress.buyPerk(id)) audio.play('buy');
          }}
          onEmbark={() => {
            if (!progress.embark()) return;
            audio.play('success');
            gameRef.current = null;
            showToast(`Vyplouváš na ${save.expedition + 2}. výpravu! Moře je nebezpečnější, ale poklady cennější.`, 4);
          }}
          onClose={() => setScreen(returnTo)}
        />
      )}
      {screen === 'logbook' && (
        <Logbook
          save={save}
          width={width}
          height={height}
          onLearn={(id) => {
            if (progress.learn(id)) audio.play('buy');
          }}
          onClose={() => setScreen(returnTo)}
        />
      )}
      {screen === 'worldmap' && <WorldMap save={save} width={width} height={height} onTravel={travelTo} onClose={() => setScreen(returnTo)} />}
      {screen === 'ending' && (
        <Ending
          save={save}
          height={height}
          tide={save.ending && tideChoice && !save.tideEnding ? tideChoice : undefined}
          onTide={(id) => {
            progress.chooseTideEnding(id);
            audio.play('success');
          }}
          onChoose={(id) => {
            progress.chooseEnding(id);
            audio.play('success');
          }}
          onClose={() => setScreen('play')}
        />
      )}
      {merchant && screen === 'play' && (
        <View style={styles.merchant}>
          <Text style={styles.merchantTitle}>Obchodník na moři</Text>
          <Text style={styles.merchantText}>Balíček zásob na příští ponor: lékárnička, balón a harpuna.</Text>
          <View style={styles.boatButtons}>
            <GameButton
              size="sm"
              label={`Koupit za ${merchantPrice} $`}
              disabled={save.money < merchantPrice}
              onPress={() => {
                if (progress.buySupplies(merchantPrice)) {
                  audio.play('buy');
                  if (gameRef.current) gameRef.current.supplies = { medkit: 1, balloon: 1, harpoon: 1 };
                  setMerchant(false);
                }
              }}
            />
            <GameButton size="sm" variant="navy" label="Odplout" onPress={() => setMerchant(false)} />
          </View>
        </View>
      )}
      {screen === 'port' && (
        <Port
          save={save}
          width={width}
          height={height}
          progress={progress}
          onClose={() => {
            if (gameRef.current?.phase === 'boat') gameRef.current = freshWorld(gameRef.current.challenge);
            setScreen(returnTo);
          }}
        />
      )}
      {screen === 'modes' && <Modes save={save} width={width} height={height} onStart={startMode} onClose={() => setScreen(returnTo)} />}
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
  boatButtonsWrap: { flexWrap: 'wrap', justifyContent: 'center' },
  boatRowPortrait: { position: 'absolute', alignItems: 'center', gap: 8 },
  boatHint: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, textAlign: 'right', ...textShadow },
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
  merchant: { position: 'absolute', alignSelf: 'center', top: '30%', backgroundColor: COLORS.panel, borderRadius: 16, padding: 14, gap: 8, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center', maxWidth: 360 },
  merchantTitle: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 18 },
  merchantText: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 13, textAlign: 'center' },
  dialogShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(2, 16, 40, 0.45)' },
  toastText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 16, textAlign: 'center', ...textShadow },
});
