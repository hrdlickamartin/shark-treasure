import { oceanOf } from './oceans';
import type { Region } from './regions';
import type { GameState } from './types';
import { hash, smoothstep } from './rng';

const BLEND = 600;
const START_FLAT = 380;
const START_DEPTH = 220;
export const DEPTH_SCALE = 1.25;

function lattice(seed: number, i: number): number {
  return hash(seed, i) / 4294967296;
}

export function valueNoise(seed: number, x: number, scale: number): number {
  const p = x / scale;
  const i = Math.floor(p);
  const f = smoothstep(p - i);
  return lattice(seed, i) * (1 - f) + lattice(seed, i + 1) * f;
}

function profileAt(regions: Region[], x: number): { base: number; amplitude: number } {
  const d = Math.abs(x);
  let index = 0;
  for (let i = 0; i < regions.length; i++) if (d >= regions[i].start) index = i;
  const current = regions[index];
  const next = regions[index + 1];
  let base = current.baseDepth * DEPTH_SCALE;
  let amplitude = current.amplitude * DEPTH_SCALE;
  if (next && d > next.start - BLEND) {
    const t = smoothstep((d - (next.start - BLEND)) / BLEND);
    base = base + (next.baseDepth * DEPTH_SCALE - base) * t;
    amplitude = amplitude + (next.amplitude * DEPTH_SCALE - amplitude) * t;
  }
  if (d < START_FLAT + 300) {
    const t = smoothstep(Math.max(0, d - START_FLAT) / 300);
    base = START_DEPTH + (base - START_DEPTH) * t;
    amplitude = 8 + (amplitude - 8) * t;
  }
  return { base, amplitude };
}

export function seabedY(seed: number, x: number, regions: Region[]): number {
  const { base, amplitude } = profileAt(regions, x);
  const large = (valueNoise(seed, x, 300) - 0.5) * 2 * amplitude;
  const small = (valueNoise(seed + 17, x, 75) - 0.5) * amplitude * 0.35;
  return base + large + small;
}

export function floorAt(state: GameState, x: number): number {
  return state.mode === 'endless' ? Number.POSITIVE_INFINITY : seabedY(state.seed, x, oceanOf(state).regions);
}
