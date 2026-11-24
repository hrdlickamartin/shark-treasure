import { oceanOf } from '../oceans';
import { between } from '../rng';
import { floorAt } from '../terrain';
import type { BoatEventKind, GameState } from '../types';
import { propFromSpec } from './props';

const EVENT_DISTANCE = 1600;
const EVENT_CHANCE = 0.2;
const KINDS: BoatEventKind[] = ['cargo', 'merchant', 'signal', 'sos', 'whales', 'storm'];

const TOASTS: Record<BoatEventKind, string> = {
  cargo: 'Na hladině plave ztracený náklad – propluj kolem něj.',
  merchant: 'Na obzoru je obchodní loď – připluj k ní.',
  signal: 'Sonar zachytil neznámý signál pod lodí. Ukazatel ti ukáže směr.',
  sos: 'SOS! Kousek od lodi se topí potápěč. Zachraň ho.',
  whales: 'Migrující velryby! Skvělá příležitost k fotografii.',
  storm: 'Blíží se bouře – proudy zesílí, ale poklady mají větší cenu.',
};

export function startBoatEvent(state: GameState, kind: BoatEventKind) {
  const { boat } = state;
  const ahead = boat.x + boat.facing * between(Math.random, 600, 900);
  const tier = oceanOf(state).regions[0].tier + 1;
  state.boatEvent = { kind, x: ahead };
  state.sailed = 0;
  state.events.push({ type: 'toast', text: TOASTS[kind] });
  if (kind === 'cargo') {
    state.props.push(propFromSpec(state, { id: `evt:cargo:${state.time}`, kind: 'cargo', x: ahead, lift: 0, quest: null, sprite: null, active: true, value: 150 * tier + Math.round(Math.random() * 200) }));
  } else if (kind === 'merchant') {
    state.props.push(propFromSpec(state, { id: `evt:merchant:${state.time}`, kind: 'merchant', x: ahead, lift: 0, quest: null, sprite: null, active: true, value: 0 }));
  } else if (kind === 'signal') {
    const restY = floorAt(state, ahead) - 18;
    state.chests.push({ id: `evt:signal:${state.time}`, kind: 'mystery', x: ahead, y: restY, restY, value: 300 + tier * 150, regionId: 0, falling: false, vy: 0, phase: 0, pickupDelay: 0, boss: false, inCave: false, relic: null, rolled: false });
  } else if (kind === 'sos') {
    state.props.push(propFromSpec(state, { id: `evt:sos:${state.time}`, kind: 'survivor', x: ahead, lift: 60, quest: null, sprite: null, active: false, value: 400 + tier * 150 }));
  } else if (kind === 'whales') {
    state.fish.push({ id: `evt:whale:${state.time}`, sprite: 'whale', x: ahead, y: 140, vx: boat.facing * 30, minX: ahead - 1200, maxX: ahead + 1200, count: 2, phase: 0, size: 220 });
  } else {
    state.condition = 'storm';
  }
}

export function updateBoatEvents(state: GameState, dt: number) {
  if (state.mode !== 'sea' || state.phase !== 'boat' || state.challenge || state.boatEvent) return;
  state.sailed += Math.abs(state.boat.vx) * dt;
  if (state.sailed < EVENT_DISTANCE || Math.random() > EVENT_CHANCE * dt) return;
  const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
  if (kind === 'storm' && state.condition !== 'normal') return;
  startBoatEvent(state, kind);
}
