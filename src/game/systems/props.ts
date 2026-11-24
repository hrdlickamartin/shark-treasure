import { CHESTS } from '../catalog';
import { CHUNK_W } from '../constants';
import { oceanOf } from '../oceans';
import { between, type Rng } from '../rng';
import { floorAt, seabedY } from '../terrain';
import type { ChestKind, DecorItem, GameState, Prop, PropSpec } from '../types';
import { damageDiver } from './collision';
import { burst, floatText, haptic, sfx } from './effects';

export const PICKUP_RADIUS = 46;
export const BEACON_RADIUS = 120;
export const GUARDIAN_RADIUS = 170;

const CARRY = new Set(['fragment', 'survivor', 'artifact', 'vault']);
const SWITCHES = new Set(['lever', 'node', 'echo']);
const SWITCH_LABEL: Record<string, string> = { lever: 'Páka', node: 'Uzel', echo: 'Signál' };
const SURFACE = new Set(['cargo', 'merchant']);

const LABELS: Record<string, string> = {
  fragment: 'Fragment Srdce oceánu! Dopluj s ním k lodi',
  survivor: 'Trosečník se tě drží – zpátky k lodi!',
  artifact: 'Artefakt sebrán',
  vault: 'Poklad z komnaty!',
};

export function propFromSpec(state: GameState, spec: PropSpec): Prop {
  const y = SURFACE.has(spec.kind) ? 2 : seabedY(state.seed, spec.x, oceanOf(state).regions) - spec.lift;
  return { ...spec, y, taken: false, progress: 0, phase: (spec.x % 7) + spec.lift };
}

export function chunkProps(state: GameState, index: number, x0: number, decor: DecorItem[], tier: number, r: Rng) {
  const ocean = oceanOf(state);
  if (index === 0) return;
  if (ocean.temperature && index % 2 === 0) {
    const x = x0 + between(r, 120, CHUNK_W - 120);
    state.props.push(propFromSpec(state, { id: `${index}:beacon`, kind: 'beacon', x, lift: 34, quest: null, sprite: null, active: true, value: ocean.temperature === 'heat' ? 1 : 0 }));
  }
  const wreck = decor.find((d) => d.sprite === 'wreck' || d.sprite === 'ghost_ship');
  if (ocean.sealed && wreck && r() < 0.65) {
    const x = wreck.x + (r() < 0.5 ? -1 : 1) * wreck.width * 0.25;
    state.props.push(propFromSpec(state, { id: `${index}:sealed`, kind: 'sealed', x, lift: 26, quest: null, sprite: null, active: false, value: tier }));
  }
}

function questSwitches(state: GameState, quest: string | null) {
  return state.props.filter((p) => p.quest === quest && SWITCHES.has(p.kind));
}

function openVault(state: GameState, quest: string | null) {
  for (const p of state.props) {
    if (p.quest !== quest) continue;
    if (p.kind === 'vault' || p.kind === 'guardian') p.active = true;
  }
  state.events.push({ type: 'toast', text: 'Mechanismus se probudil – komnata je otevřená!' });
  sfx(state, 'success', 0.8);
  haptic(state, 'success');
}

function sealedChest(state: GameState, prop: Prop) {
  const kind: ChestKind = prop.value >= 6 ? 'legendary' : prop.value >= 4 ? 'jeweled' : 'epic';
  const info = CHESTS[kind];
  const restY = floorAt(state, prop.x) - info.width * 0.32;
  const value = Math.round((info.min + (info.max - info.min) * 0.6) / 5) * 5;
  state.chests.push({ id: `${prop.id}:chest`, kind, x: prop.x, y: restY - 30, restY, value, regionId: 0, falling: true, vy: 0, phase: 0, pickupDelay: 0.6, boss: false, inCave: false, relic: null, rolled: false });
}

export function updateProps(state: GameState, dt: number) {
  const { diver, stats, boat } = state;
  const diving = state.phase === 'dive' && diver.state === 'diving';
  for (const prop of state.props) {
    prop.phase += dt;
    if (prop.taken) continue;
    if (SURFACE.has(prop.kind)) {
      if (state.phase === 'boat' && Math.abs(boat.x - prop.x) < 80) {
        prop.taken = true;
        if (prop.kind === 'cargo') state.events.push({ type: 'cargo', value: prop.value });
        else state.events.push({ type: 'merchant' });
        sfx(state, 'coins', 0.8);
      }
      continue;
    }
    const d = Math.hypot(diver.x - prop.x, diver.y - prop.y);
    if (prop.kind === 'guardian') {
      prop.progress = Math.max(0, prop.progress - dt);
      if (!prop.active && diving && d < GUARDIAN_RADIUS && prop.progress <= 0) {
        prop.progress = 1.6;
        damageDiver(state, 18, 'guardian', prop.x, prop.y, true);
        burst(state, 'spark', diver.x, diver.y, 12, 160, 0.4, 5);
        sfx(state, 'zap', 0.9);
        floatText(state, 'Strážce tě nepustí!', prop.x, prop.y - 80, '#20D4E8');
      }
      continue;
    }
    if (!diving) continue;
    if (prop.kind === 'sealed') {
      if (d > PICKUP_RADIUS + 14) {
        prop.active = false;
        continue;
      }
      if (stats.cutter <= 0) {
        if (!prop.active) floatText(state, 'Zapečetěno – potřebuješ řezák', prop.x, prop.y - 50, '#A9C8EC');
        prop.active = true;
        continue;
      }
      prop.active = true;
      const time = Math.max(0.6, 2 - stats.cutter * 0.5);
      prop.progress += dt / time;
      if (Math.random() < dt * 12) burst(state, 'spark', prop.x, prop.y - 10, 2, 90, 0.3, 3);
      if (prop.progress >= 1) {
        prop.taken = true;
        state.record.cut += 1;
        sealedChest(state, prop);
        floatText(state, 'Rozříznuto!', prop.x, prop.y - 50, '#FFBF32');
        sfx(state, 'chest_open', 0.8);
        haptic(state, 'success');
      }
      continue;
    }
    if (d > PICKUP_RADIUS) continue;
    if (SWITCHES.has(prop.kind)) {
      if (prop.active) continue;
      prop.active = true;
      state.record.activated.push(prop.id);
      const switches = questSwitches(state, prop.quest);
      const done = switches.filter((p) => p.active).length;
      floatText(state, `${SWITCH_LABEL[prop.kind]} ${done}/${switches.length}`, prop.x, prop.y - 50, '#20D4E8');
      sfx(state, 'click', 0.9);
      haptic(state, 'light');
      if (prop.kind === 'echo') state.events.push({ type: 'radio', topic: 'echo' });
      if (done === switches.length && state.props.some((p) => p.quest === prop.quest && p.kind === 'vault')) openVault(state, prop.quest);
      continue;
    }
    if (!CARRY.has(prop.kind)) continue;
    if (prop.kind === 'vault' && !prop.active) {
      if (prop.progress <= 0) floatText(state, 'Zamčeno – aktivuj mechanismy', prop.x, prop.y - 50, '#A9C8EC');
      prop.progress = 2;
      continue;
    }
    prop.taken = true;
    diver.cargo.push(prop.id);
    if (prop.quest) state.events.push({ type: 'radio', topic: 'quest_item' });
    floatText(state, LABELS[prop.kind] ?? 'Sebráno', prop.x, prop.y - 50, '#FFBF32');
    burst(state, 'spark', prop.x, prop.y, 12, 120, 0.6, 5);
    sfx(state, 'chest_open', 0.8);
    haptic(state, 'success');
  }
  for (const prop of state.props) if (prop.kind === 'vault' && prop.progress > 0) prop.progress = Math.max(0, prop.progress - dt);
}

export function nearBeacon(state: GameState): boolean {
  const { diver } = state;
  return state.props.some((p) => p.kind === 'beacon' && Math.hypot(diver.x - p.x, diver.y - p.y) < BEACON_RADIUS);
}

export function objectiveProps(state: GameState): Prop[] {
  return state.props.filter((p) => {
    if (p.taken) return false;
    if (SWITCHES.has(p.kind)) return !p.active;
    if (p.kind === 'vault') return p.active;
    return CARRY.has(p.kind);
  });
}
