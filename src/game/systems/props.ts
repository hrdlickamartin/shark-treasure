import { CHESTS } from '../catalog';
import { CHUNK_W } from '../constants';
import { oceanOf } from '../oceans';
import { between, type Rng } from '../rng';
import { floorAt, seabedY } from '../terrain';
import type { ChestKind, DecorItem, GameState, Prop, PropSpec } from '../types';
import { damageDiver } from './collision';
import { burst, floatText, haptic, sfx } from './effects';
import { MATERIALS, type MaterialId } from '../gear';
import { GATE_LEVER_TIME } from './tide';

export const PICKUP_RADIUS = 46;
export const BEACON_RADIUS = 120;
export const GUARDIAN_RADIUS = 170;
export const RIFT_RADIUS = 260;
export const VENT_CYCLE = 8;
export const VENT_EXHALE = 3;
export const VENT_HEIGHT = 320;
export const DIG_REWARD = 2500;

const CARRY = new Set(['fragment', 'survivor', 'artifact', 'vault', 'shard', 'heartstone']);
const SWITCHES = new Set(['lever', 'node', 'echo']);
const SWITCH_LABEL: Record<string, string> = { lever: 'Páka', node: 'Uzel', echo: 'Signál' };
const SURFACE = new Set(['cargo', 'merchant', 'bottle']);

const LABELS: Record<string, string> = {
  fragment: 'Fragment Srdce oceánu! Dopluj s ním k lodi',
  survivor: 'Trosečník se tě drží – zpátky k lodi!',
  artifact: 'Artefakt sebrán',
  vault: 'Poklad z komnaty!',
  shard: 'Atlantský úlomek! Dopluj s ním k lodi',
  heartstone: 'Srdeční kámen! Je těžký – opatrně k lodi',
};

export function propFromSpec(state: GameState, spec: PropSpec): Prop {
  const y = SURFACE.has(spec.kind) ? 2 : seabedY(state.seed, spec.x, oceanOf(state).regions) - spec.lift;
  if (spec.kind === 'dig') return { ...spec, y, taken: false, progress: 0, phase: 0, active: false };
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

export function ventExhaling(prop: Prop): boolean {
  return prop.progress % VENT_CYCLE < VENT_EXHALE;
}

export function ventLift(state: GameState): Prop | null {
  const { diver } = state;
  return state.props.find((p) => p.kind === 'vent' && ventExhaling(p) && Math.abs(diver.x - p.x) < 42 && diver.y < p.y && diver.y > p.y - VENT_HEIGHT) ?? null;
}

export function riftAt(state: GameState, x: number, y: number): Prop | null {
  return state.props.find((p) => p.kind === 'rift' && Math.hypot(x - p.x, y - p.y) < RIFT_RADIUS) ?? null;
}

export function inRift(state: GameState): boolean {
  return state.diver.state === 'diving' && !!riftAt(state, state.diver.x, state.diver.y);
}

function pickMaterial(state: GameState, prop: Prop) {
  const id = prop.tag as MaterialId;
  prop.taken = true;
  state.record.materials = { ...state.record.materials, [id]: (state.record.materials[id] ?? 0) + prop.value };
  floatText(state, `+${prop.value} ${MATERIALS[id]?.name ?? 'materiál'}`, prop.x, prop.y - 40, '#FFBF32');
  burst(state, 'spark', prop.x, prop.y, 8, 90, 0.5, 4);
  sfx(state, 'collect', 0.6);
  haptic(state, 'light');
  if (!state.record.discoveries.includes('material')) {
    state.record.discoveries.push('material');
    state.events.push({ type: 'toast', text: 'Materiál! Z materiálů vyrobíš v dílně výbavu a moduly lodi.' });
  }
}

function digUp(state: GameState, prop: Prop) {
  prop.taken = true;
  state.diver.cargo.push(prop.id);
  const restY = floorAt(state, prop.x) - CHESTS.legendary.width * 0.32;
  state.chests.push({ id: `${prop.id}:chest`, kind: 'legendary', x: prop.x, y: restY - 40, restY, value: DIG_REWARD, regionId: 0, falling: true, vy: -60, phase: 0, pickupDelay: 0.5, boss: false, inCave: false, relic: null, rolled: false });
  burst(state, 'sand', prop.x, prop.y, 18, 140, 0.9, 5);
  floatText(state, 'Poklad z mapy!', prop.x, prop.y - 60, '#FFBF32');
  sfx(state, 'chest_open', 0.9);
  haptic(state, 'success');
}

function updateVent(state: GameState, prop: Prop, dt: number) {
  prop.progress += dt;
  const exhale = ventExhaling(prop);
  prop.active = exhale;
  if (exhale && Math.random() < dt * 16) {
    state.particles.push({ kind: 'bubble', x: prop.x + (Math.random() - 0.5) * 30, y: prop.y - 10, vx: (Math.random() - 0.5) * 16, vy: -120 - Math.random() * 80, life: 2, maxLife: 2, size: 4 + Math.random() * 6 });
  }
  const { diver } = state;
  if (exhale && diver.state === 'diving' && Math.abs(diver.x - prop.x) < 42 && diver.y < prop.y && diver.y > prop.y - VENT_HEIGHT) diver.vy -= 90 * dt;
}

function updateRift(state: GameState, prop: Prop, dt: number) {
  for (let i = state.chests.length - 1; i >= 0; i--) {
    const chest = state.chests[i];
    if (Math.hypot(chest.x - prop.x, chest.y - prop.y) > RIFT_RADIUS) continue;
    chest.falling = false;
    chest.y -= 22 * dt;
    chest.x += Math.sin(chest.phase) * 8 * dt;
    if (chest.y < prop.y - RIFT_RADIUS * 0.9) {
      state.chests.splice(i, 1);
      burst(state, 'spark', chest.x, chest.y, 10, 90, 0.6, 5);
      floatText(state, 'Truhla zmizela v trhlině', chest.x, chest.y - 30, '#C8B6FF');
    }
  }
  if (Math.random() < dt * 5) {
    const a = Math.random() * Math.PI * 2;
    state.particles.push({ kind: 'spark', x: prop.x + Math.cos(a) * RIFT_RADIUS * 0.8, y: prop.y + Math.sin(a) * RIFT_RADIUS * 0.8, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 1.2, maxLife: 1.2, size: 4 });
  }
}

function activateSwitch(state: GameState, prop: Prop): boolean {
  if (!prop.tag) return false;
  if (prop.tag.startsWith('gate:')) {
    const gate = state.props.find((p) => p.id === prop.tag!.slice(5));
    if (!gate || prop.progress > 0) return true;
    gate.progress = GATE_LEVER_TIME;
    prop.progress = GATE_LEVER_TIME;
    floatText(state, `Brána otevřená na ${GATE_LEVER_TIME} s`, prop.x, prop.y - 50, '#20D4E8');
    sfx(state, 'gate', 0.8);
    haptic(state, 'light');
    return true;
  }
  if (prop.tag === 'vortex') {
    if (prop.active) return true;
    prop.active = true;
    const done = state.props.filter((p) => p.tag === 'vortex' && p.active).length;
    floatText(state, `Brána víru ${done}/2 – okruh se zkracuje`, prop.x, prop.y - 50, '#20D4E8');
    sfx(state, 'gate', 0.9);
    haptic(state, 'light');
    return true;
  }
  return false;
}

function cutChain(state: GameState, prop: Prop, dt: number, d: number) {
  const { stats } = state;
  if (d > PICKUP_RADIUS + 14) return;
  if (stats.cutter <= 0) {
    if (prop.progress <= 0) floatText(state, 'Řetěz – potřebuješ řezák', prop.x, prop.y - 50, '#A9C8EC');
    prop.progress = Math.max(prop.progress, 0.001);
    return;
  }
  prop.progress += dt / Math.max(0.6, 2 - stats.cutter * 0.5);
  if (Math.random() < dt * 12) burst(state, 'spark', prop.x, prop.y - 10, 2, 90, 0.3, 3);
  if (prop.progress < 1) return;
  prop.taken = true;
  state.record.cut += 1;
  const left = state.props.filter((p) => p.kind === 'chain' && p.tag === prop.tag && !p.taken).length;
  floatText(state, left ? `Řetěz přetnut – zbývá ${left}` : 'Ulita je volná!', prop.x, prop.y - 50, '#FFBF32');
  sfx(state, 'chest_open', 0.8);
  haptic(state, 'success');
  if (!left) state.events.push({ type: 'toast', text: 'Řetězy povolily! Dutá ulita je zranitelná – zasáhni ji harpunou.' });
}

export function updateProps(state: GameState, dt: number) {
  const { diver, stats, boat } = state;
  const diving = state.phase === 'dive' && diver.state === 'diving';
  for (const prop of state.props) {
    if (prop.kind !== 'gate') prop.phase += dt;
    if (prop.taken) continue;
    if (SURFACE.has(prop.kind)) {
      if (state.phase === 'boat' && Math.abs(boat.x - prop.x) < 80) {
        prop.taken = true;
        if (prop.kind === 'cargo') state.events.push({ type: 'cargo', value: prop.value });
        else if (prop.kind === 'bottle') state.events.push({ type: 'bottle' });
        else state.events.push({ type: 'merchant' });
        sfx(state, 'coins', 0.8);
      }
      continue;
    }
    if (prop.kind === 'vent') {
      updateVent(state, prop, dt);
      continue;
    }
    if (prop.kind === 'rift') {
      updateRift(state, prop, dt);
      continue;
    }
    if (prop.kind === 'gate') continue;
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
    if (prop.kind === 'lever' && prop.tag?.startsWith('gate:')) {
      const was = prop.progress;
      prop.progress = Math.max(0, prop.progress - dt);
      if (was > 0 && prop.progress <= 0) prop.active = false;
    }
    if (!diving) continue;
    if (prop.kind === 'chain') {
      cutChain(state, prop, dt, d);
      continue;
    }
    if (prop.kind === 'material') {
      if (d < PICKUP_RADIUS) pickMaterial(state, prop);
      continue;
    }
    if (prop.kind === 'dig') {
      if (!prop.active && state.sonarTime > 0 && d < state.stats.sonarRange) {
        prop.active = true;
        floatText(state, 'Sonar: něco je zahrabané!', prop.x, prop.y - 50, '#FFBF32');
      }
      if (prop.active && d < PICKUP_RADIUS) digUp(state, prop);
      continue;
    }
    if (prop.kind === 'scan') continue;
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
      if (activateSwitch(state, prop)) {
        prop.active = true;
        continue;
      }
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
    if (p.kind === 'scan') return !p.active && !!p.quest;
    if (p.kind === 'shard') return true;
    if (p.kind === 'dig') return true;
    if (SWITCHES.has(p.kind)) return !!p.quest && !p.active;
    if (p.kind === 'vault') return p.active;
    return CARRY.has(p.kind);
  });
}
