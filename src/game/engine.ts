import { BOAT_DECK_Y, MAX_DT, MAX_HEALTH } from './constants';
import { updateAmbient } from './systems/ambient';
import { updateAnimation } from './systems/animation';
import { updateCamera } from './systems/camera';
import { updateDive } from './systems/dive';
import { updateEnemies } from './systems/enemies';
import { updateBoat, updateDiverMovement } from './systems/movement';
import { updateOxygen } from './systems/oxygen';
import { updateTreasure } from './systems/treasure';
import type { GameEvent, GameState, Input, Stats, View } from './types';
import { ensureChunks } from './world';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function createGame(stats: Stats, view: View, boatX = 0): GameState {
  const state: GameState = {
    seed: newSeed(),
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
    record: { startTime: 0, maxDepth: 0, hits: 0, regionMax: 0, fullWarned: -10 },
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
  };
  ensureChunks(state, boatX, view.width);
  updateCamera(state, view, 0, true);
  return state;
}

export function newWorld(state: GameState, view: View): GameState {
  const next = createGame(state.stats, view, state.boat.x);
  next.time = state.time;
  return next;
}

export function step(state: GameState, input: Input, rawDt: number, view: View): GameEvent[] {
  const dt = Math.min(MAX_DT, Math.max(0, rawDt));
  state.time += dt;

  if (state.phase === 'boat') {
    updateBoat(state, input, dt);
    state.diver.x = state.boat.x - state.boat.shown * 44 * (1 + state.stats.boatLevel * 0.07);
    state.diver.y = BOAT_DECK_Y;
    state.diver.facing = state.boat.shown;
  } else if (state.phase === 'dive') {
    if (state.diver.state === 'diving') {
      updateDiverMovement(state, input, dt);
      updateOxygen(state, dt);
    }
    updateDive(state, dt);
    updateTreasure(state, dt);
  } else {
    updateTreasure(state, dt);
  }

  updateEnemies(state, dt);
  updateAmbient(state, dt);
  updateAnimation(state, dt);
  updateCamera(state, view, dt);
  ensureChunks(state, state.camera.x, view.width);

  const events = state.events;
  state.events = [];
  return events;
}
