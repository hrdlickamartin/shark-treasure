import { REGIONS } from './regions';
import { hash, smoothstep } from './rng';

const BLEND = 600;
const START_FLAT = 380;
const START_DEPTH = 150;

function lattice(seed: number, i: number): number {
  return hash(seed, i) / 4294967296;
}

function valueNoise(seed: number, x: number, scale: number): number {
  const p = x / scale;
  const i = Math.floor(p);
  const f = smoothstep(p - i);
  return lattice(seed, i) * (1 - f) + lattice(seed, i + 1) * f;
}

function profileAt(x: number): { base: number; amplitude: number } {
  const d = Math.abs(x);
  let index = 0;
  for (let i = 0; i < REGIONS.length; i++) if (d >= REGIONS[i].start) index = i;
  const current = REGIONS[index];
  const next = REGIONS[index + 1];
  let base = current.baseDepth;
  let amplitude = current.amplitude;
  if (next && d > next.start - BLEND) {
    const t = smoothstep((d - (next.start - BLEND)) / BLEND);
    base = base + (next.baseDepth - base) * t;
    amplitude = amplitude + (next.amplitude - amplitude) * t;
  }
  if (d < START_FLAT + 300) {
    const t = smoothstep(Math.max(0, d - START_FLAT) / 300);
    base = START_DEPTH + (base - START_DEPTH) * t;
    amplitude = 8 + (amplitude - 8) * t;
  }
  return { base, amplitude };
}

export function seabedY(seed: number, x: number): number {
  const { base, amplitude } = profileAt(x);
  const large = (valueNoise(seed, x, 300) - 0.5) * 2 * amplitude;
  const small = (valueNoise(seed + 17, x, 75) - 0.5) * amplitude * 0.35;
  return base + large + small;
}
