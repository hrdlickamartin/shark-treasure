import { BOAT_DECK_Y, MAX_DT, MAX_HEALTH } from './constants';
import { updateAmbient } from './systems/ambient';
import { updateAnimation } from './systems/animation';
import { updateCamera } from './systems/camera';
import { updateDive } from './systems/dive';
import { updateEnemies } from './systems/enemies';
import { updateBoat, updateDiverMovement } from './systems/movement';
import { updateOxygen } from './systems/oxygen';
import { updateTreasure } from './systems/treasure';
import { CHALLENGES, rollCondition } from './modifiers';
import { updateExtras } from './systems/extras';
import type { BoatDecor, ChallengeId, GameMode, GameVariant, PropSpec, Supplies, Condition, GameEvent, GameState, Input, RelicId, SkinId, Stats, View } from './types';
import type { KitCounts } from './gear';
import { updateTide } from './systems/tide';
import { updateDrone } from './systems/drone';
import { updateCollapse } from './systems/collapse';
import { updateMarkers } from './systems/kit';
import { newDrone, newRecord } from './records';
import { ensureShaft, updateShaft } from './endless';
import { DEFAULT_OCEAN, type OceanId } from './oceans';
import { propFromSpec, updateProps } from './systems/props';
import { updateEnvironment } from './systems/environment';
import { updateBoatEvents } from './systems/events';
import { ensureChunks } from './world';

function ensureWorld(state: GameState, view: View) {
  if (state.mode === 'endless') ensureShaft(state, state.camera.y, view.height);
  else ensureChunks(state, state.camera.x, view.width);
}

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export interface WorldOptions {
  ownedRelics: RelicId[];
  skin: SkinId;
  challenge: ChallengeId | null;
  condition?: Condition;
  calm?: boolean;
  mode?: GameMode;
  ocean?: OceanId;
  shaftBest?: number;
  props?: PropSpec[];
  supplies?: Supplies;
  expansion?: boolean;
  variant?: GameVariant;
  kit?: KitCounts;
  seed?: number;
  tideScale?: number;
  reduceMotion?: boolean;
  boatDecor?: BoatDecor[];
  rarityShapes?: boolean;
}

const DEFAULT_OPTIONS: WorldOptions = { ownedRelics: [], skin: 'classic', challenge: null, calm: true };

export function createGame(stats: Stats, view: View, boatX = 0, options: WorldOptions = DEFAULT_OPTIONS): GameState {
  const forced = options.challenge ? CHALLENGES[options.challenge].condition : null;
  const condition = options.condition ?? forced ?? (options.calm ? 'normal' : rollCondition(Math.random));
  const mode = options.mode ?? 'sea';
  const state: GameState = {
    mode,
    ocean: options.ocean ?? DEFAULT_OCEAN,
    shaftSegments: new Set(),
    airs: [],
    shaftBest: options.shaftBest ?? 0,
    shaftMark: 0,
    seed: options.seed ?? newSeed(),
    time: 0,
    phase: 'boat',
    diver: {
      x: boatX - 20,
      y: BOAT_DECK_Y,
      vx: 0,
      vy: 0,
      facing: 1,
      health: MAX_HEALTH,
      oxygen: stats.oxygenMax,
      invuln: 0,
      hurt: 0,
      stun: 0,
      carried: [],
      coins: 0,
      state: 'boat',
      stateTime: 0,
      collectFlash: 0,
      anim: { kick: 0, turn: 1, tilt: 0, idle: 1, still: 1 },
      balloons: 0,
      repellents: 0,
      medkits: 0,
      harpoons: 0,
      atSub: false,
      cargo: [],
      temp: 100,
      breathing: true,
      inAir: false,
      kit: { ...(options.kit ?? {}) },
      anchor: 0,
      immune: 0,
      tow: false,
      reserveUsed: false,
      deflectUsed: false,
      canisterUsed: false,
      bellUsed: false,
      turnBoost: 0,
    },
    boat: { x: boatX, vx: 0, lockedNotice: 0, facing: 1, shown: 1, reverse: 0, turnFx: 0 },
    camera: { x: boatX, y: -view.height * 0.42, shake: 0, offsetX: 0, offsetY: 0 },
    chunks: new Map(),
    chests: [],
    coins: [],
    sharks: [],
    hazards: [],
    currents: [],
    fish: [],
    particles: [],
    texts: [],
    record: newRecord(0, boatX, 0),
    stats,
    sonarTime: 0,
    sonarCooldown: 0,
    lastDamage: null,
    alarmTimer: 0,
    bubbleTimer: 0,
    swimTimer: 0,
    sharkSoundTimer: 0,
    textId: 0,
    events: [],
    balloons: [],
    inkTime: 0,
    repelTime: 0,
    sub: null,
    props: [],
    photoCooldown: 0,
    photoAim: null,
    photoMode: 0,
    harpoonShots: [],
    harpoonAim: null,
    harpoonCooldown: 0,
    boatEvent: null,
    sailed: 0,
    supplies: options.supplies ?? { medkit: 0, balloon: 0, harpoon: 0 },
    boostTime: 0,
    boostCooldown: 0,
    condition,
    challenge: options.challenge,
    ownedRelics: options.ownedRelics,
    skin: options.skin,
    seenChests: [],
    entityId: 0,
    variant: options.variant ?? 'normal',
    expansion: !!options.expansion,
    tideScale: options.tideScale ?? 1,
    tideHigh: true,
    tideWarned: false,
    drone: newDrone(boatX, BOAT_DECK_Y),
    collapse: null,
    rocks: [],
    markers: [],
    revealed: [],
    kitSlot: 0,
    reduceMotion: !!options.reduceMotion,
    boatDecor: options.boatDecor ?? [],
    rarityShapes: !!options.rarityShapes,
  };
  if (mode === 'sea') state.props = (options.props ?? []).map((spec) => propFromSpec(state, spec));
  ensureWorld(state, view);
  updateCamera(state, view, 0, true);
  ensureWorld(state, view);
  return state;
}

export function newWorld(state: GameState, view: View, stats: Stats, options: WorldOptions): GameState {
  const next = createGame(stats, view, state.boat.x, options);
  next.time = state.time;
  next.boat.facing = state.boat.facing;
  next.boat.shown = state.boat.shown;
  return next;
}

export function step(state: GameState, input: Input, rawDt: number, view: View): GameEvent[] {
  const dt = Math.min(MAX_DT, Math.max(0, rawDt));
  state.time += dt;

  if (state.phase === 'boat') {
    updateBoat(state, input, dt);
    updateBoatEvents(state, dt);
    state.diver.x = state.boat.x - state.boat.shown * 44 * (1 + state.stats.boatLevel * 0.07);
    state.diver.y = BOAT_DECK_Y;
    state.diver.facing = state.boat.shown;
  } else if (state.phase === 'dive') {
    if (state.diver.state === 'diving') {
      updateDiverMovement(state, input, dt);
      updateOxygen(state, dt);
      updateEnvironment(state, dt);
    }
    updateDive(state, dt);
    updateTreasure(state, dt);
  } else {
    updateTreasure(state, dt);
  }

  updateTide(state, dt);
  updateEnemies(state, dt);
  updateProps(state, dt);
  updateDrone(state, dt);
  updateCollapse(state, dt);
  updateMarkers(state, dt);
  updateExtras(state, dt);
  updateAmbient(state, dt);
  updateAnimation(state, dt);
  updateCamera(state, view, dt);
  ensureWorld(state, view);
  if (state.mode === 'endless') updateShaft(state, dt);

  const events = state.events;
  state.events = [];
  return events;
}
