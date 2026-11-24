import { ANCHOR_TIME, ANTIDOTE_TIME, BAIT_TIME, CANISTER_SHARE, FLARE_RADIUS, FLARE_TIME, KIT, KIT_IDS, type KitId, SPRINT_TIME } from '../gear';
import type { GameState } from '../types';
import { burst, floatText, haptic, sfx } from './effects';
import { haulHeavy } from './haul';

export function availableKit(state: GameState): KitId[] {
  return KIT_IDS.filter((id) => (state.diver.kit[id] ?? 0) > 0);
}

export function selectedKit(state: GameState): KitId | null {
  const list = availableKit(state);
  if (list.length === 0) return null;
  return list[((state.kitSlot % list.length) + list.length) % list.length];
}

export function cycleKit(state: GameState) {
  const list = availableKit(state);
  if (list.length < 2) return;
  state.kitSlot = (state.kitSlot + 1) % list.length;
  sfx(state, 'click', 0.5);
}

function consume(state: GameState, id: KitId) {
  const { diver, record } = state;
  diver.kit = { ...diver.kit, [id]: (diver.kit[id] ?? 0) - 1 };
  record.kitUsed = { ...record.kitUsed, [id]: (record.kitUsed[id] ?? 0) + 1 };
  floatText(state, KIT[id].name, diver.x, diver.y - 60, '#FFBF32');
  haptic(state, 'light');
}

export function applyKit(state: GameState) {
  const { diver, stats } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving') return;
  const id = selectedKit(state);
  if (!id) return;
  if (id === 'canister') {
    if (diver.canisterUsed) {
      floatText(state, 'Patronu už jsi použil', diver.x, diver.y - 50, '#A9C8EC');
      return;
    }
    diver.canisterUsed = true;
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * CANISTER_SHARE);
    burst(state, 'bubble', diver.x, diver.y - 10, 14, 80, 1, 6);
    sfx(state, 'bubbles', 0.9);
  } else if (id === 'tow') {
    if (!haulHeavy(state, 'Vlečné lano')) {
      floatText(state, 'Nemáš těžkou truhlu', diver.x, diver.y - 50, '#A9C8EC');
      return;
    }
  } else if (id === 'flare') {
    state.markers.push({ id: ++state.entityId, kind: 'flare', x: diver.x, y: diver.y, time: FLARE_TIME });
    burst(state, 'spark', diver.x, diver.y, 16, 160, 0.8, 6);
    for (const shark of state.sharks) {
      if (shark.dying || Math.hypot(shark.x - diver.x, shark.y - diver.y) > FLARE_RADIUS * 0.75) continue;
      shark.mode = 'retreat';
      shark.timer = 2;
    }
    sfx(state, 'zap', 0.6);
  } else if (id === 'bait') {
    const x = diver.x + diver.facing * 140;
    state.markers.push({ id: ++state.entityId, kind: 'bait', x, y: diver.y + 20, time: BAIT_TIME });
    burst(state, 'cloud', x, diver.y + 20, 8, 60, 1.2, 14);
    sfx(state, 'drop', 0.7);
  } else if (id === 'buoy') {
    state.markers.push({ id: ++state.entityId, kind: 'buoy', x: diver.x, y: diver.y, time: 9999 });
    sfx(state, 'click', 0.8);
  } else if (id === 'anchor') {
    diver.anchor = ANCHOR_TIME;
    sfx(state, 'drop', 0.6);
  } else if (id === 'antidote') {
    diver.immune = ANTIDOTE_TIME;
    burst(state, 'spark', diver.x, diver.y, 10, 70, 0.6, 5);
  } else if (id === 'sprint') {
    state.boostTime = Math.max(state.boostTime, SPRINT_TIME);
    sfx(state, 'bubbles', 0.9);
  }
  consume(state, id);
}

export function updateMarkers(state: GameState, dt: number) {
  const { diver } = state;
  diver.anchor = Math.max(0, diver.anchor - dt);
  diver.immune = Math.max(0, diver.immune - dt);
  diver.turnBoost = Math.max(0, diver.turnBoost - dt);
  for (const m of state.markers) {
    m.time -= dt;
    if (m.kind === 'bait' && Math.random() < dt * 6) state.particles.push({ kind: 'cloud', x: m.x + (Math.random() - 0.5) * 30, y: m.y, vx: (Math.random() - 0.5) * 20, vy: -10, life: 1.2, maxLife: 1.2, size: 10 });
    if (m.kind === 'flare' && Math.random() < dt * 14) state.particles.push({ kind: 'spark', x: m.x, y: m.y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, life: 0.6, maxLife: 0.6, size: 4 });
  }
  state.markers = state.markers.filter((m) => m.time > 0);
}

export function activeMarker(state: GameState, kind: 'flare' | 'bait' | 'buoy', x: number, y: number, radius: number) {
  return state.markers.find((m) => m.kind === kind && Math.hypot(m.x - x, m.y - y) < radius) ?? null;
}

export function lit(state: GameState, x: number, y: number): boolean {
  if (activeMarker(state, 'flare', x, y, FLARE_RADIUS)) return true;
  const d = state.drone;
  return (d.mode === 'out' || d.mode === 'scout') && Math.hypot(d.x - x, d.y - y) < 170;
}
