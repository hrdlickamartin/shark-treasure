import { SHARKS } from './catalog';
import type { Rng } from './rng';
import type { GameState, Hazard, Shark } from './types';

export const CHUNK_THREATS = [0, 2, 3, 3, 4, 4, 5, 5];
export const SEA_COLUMN_GAP = 120;
export const SHAFT_ROW_GAP = 140;

const GUARDS: Hazard['kind'][] = ['crab', 'eel', 'shadow'];
const GROUNDED: Hazard['kind'][] = ['urchin', 'spikes', 'crab', 'eel', 'mimic', 'pistol'];

export function shaftThreats(depthM: number): number {
  return Math.min(8, 3 + Math.floor(depthM / 100));
}

interface Threat {
  shark: Shark | null;
  hazard: Hazard | null;
  x: number;
  y: number;
  must: boolean;
  blocking: boolean;
  order: number;
}

export function thinThreats(state: GameState, sharkStart: number, hazardStart: number, budget: number, r: Rng, axis: 'x' | 'y', gap: number) {
  const sharks = state.sharks.slice(sharkStart);
  const hazards = state.hazards.slice(hazardStart);
  const threats: Threat[] = [
    ...sharks.map((s) => ({ shark: s, hazard: null, x: s.x, y: s.y, must: !!SHARKS[s.kind].boss, blocking: false, order: r() })),
    ...hazards.map((h) => ({ shark: null, hazard: h, x: h.x, y: h.y, must: GUARDS.includes(h.kind), blocking: !GROUNDED.includes(h.kind), order: r() })),
  ];
  threats.sort((a, b) => Number(b.must) - Number(a.must) || a.order - b.order);
  const kept: Threat[] = [];
  for (const t of threats) {
    if (!t.must && kept.length >= budget) continue;
    const distance = (k: Threat) => Math.abs(axis === 'x' ? k.x - t.x : k.y - t.y);
    if (!t.must && t.blocking && kept.some((k) => k.blocking && distance(k) < gap)) continue;
    kept.push(t);
  }
  state.sharks.splice(sharkStart, sharks.length, ...sharks.filter((s) => kept.some((k) => k.shark === s)));
  state.hazards.splice(hazardStart, hazards.length, ...hazards.filter((h) => kept.some((k) => k.hazard === h)));
}
