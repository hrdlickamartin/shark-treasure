import { PX_PER_M } from './constants';
import { between, hash, mulberry32, pick, type Rng, weighted } from './rng';
import { valueNoise } from './terrain';
import type { GameState, SharkKind } from './types';
import { newHazard, newShark } from './world';
import { SHAFT_ROW_GAP, shaftThreats, thinThreats } from './density';
import { SPIKE_CYCLE } from './systems/creatures';
import { floatText, haptic, sfx } from './systems/effects';

export const SHAFT_SEG = 800;
export const SHAFT_UNLOCK_M = 50;
const AIR_RADIUS = 36;
const AIR_REFILL = 0.3;
const KEEP_ABOVE = 2600;
const FISH = ['fish_clown', 'fish_yellow', 'fish_blue'] as const;

export function shaftWalls(seed: number, y: number): { left: number; right: number } {
  const depth = Math.max(0, y);
  const half = Math.max(170, 520 - depth * 0.08);
  const sway = Math.min(160, 40 + depth * 0.04);
  const center = (valueNoise(seed, depth, 520) - 0.5) * 2 * sway;
  const rough = (valueNoise(seed + 5, depth, 90) - 0.5) * 44;
  return { left: center - half + rough, right: center + half + rough * 0.6 };
}

function sharkKindAt(r: Rng, depthM: number): SharkKind {
  if (depthM < 80) return weighted<SharkKind>(r, { small: 70, reef: 30 });
  if (depthM < 160) return weighted<SharkKind>(r, { reef: 50, hammer: 40, small: 10 });
  if (depthM < 260) return weighted<SharkKind>(r, { hammer: 40, great: 40, deep: 20 });
  return weighted<SharkKind>(r, { great: 40, deep: 60 });
}

function spot(r: Rng, seed: number, y: number, margin: number): { x: number; y: number } {
  const walls = shaftWalls(seed, y);
  return { x: between(r, walls.left + margin, walls.right - margin), y };
}

function generateSegment(state: GameState, index: number) {
  const { seed } = state;
  const r = mulberry32(hash(seed, index, 77));
  const y0 = index * SHAFT_SEG;
  const depthM = y0 / PX_PER_M;
  const yAt = (from: number, to: number) => y0 + between(r, from, to) * SHAFT_SEG;
  const id = (name: string, i: number) => `a${index}:${name}${i}`;

  const airs = depthM < 200 ? 2 : depthM < 400 || r() < 0.75 ? 1 : 0;
  for (let i = 0; i < airs; i++) {
    const p = spot(r, seed, yAt(0.1, 0.9), 60);
    state.airs.push({ id: id('air', i), x: p.x, y: p.y, phase: r() * 6 });
  }

  const row = spot(r, seed, yAt(0.15, 0.85), 120);
  const value = 5 + Math.floor(depthM / 25) * 3;
  for (let i = 0; i < 6; i++) {
    state.coins.push({ id: id('coin', i), x: row.x - 75 + i * 30, y: row.y + Math.sin(i * 0.9) * 14, value, phase: r() * 6 });
  }

  if (index === 0) return;
  const sharkStart = state.sharks.length;
  const hazardStart = state.hazards.length;

  const jellies = Math.min(5, Math.floor(between(r, 1, 1.8 + depthM / 80)));
  for (let i = 0; i < jellies; i++) {
    const p = spot(r, seed, yAt(0, 1), 50);
    state.hazards.push(newHazard(id('jelly', i), 'jelly', p.x, p.y, { phase: r() * 6 }));
  }
  if (depthM > 60) {
    const mines = Math.min(4, Math.floor(r() * (1 + depthM / 150)));
    for (let i = 0; i < mines; i++) {
      const p = spot(r, seed, yAt(0, 1), 60);
      state.hazards.push(newHazard(id('mine', i), 'mine', p.x, p.y, { phase: r() * 6 }));
    }
  }
  if (depthM > 30) {
    const urchins = Math.floor(between(r, 0, 2.5));
    for (let i = 0; i < urchins; i++) {
      const y = yAt(0, 1);
      const walls = shaftWalls(seed, y);
      const side = r() < 0.5;
      state.hazards.push(newHazard(id('urchin', i), 'urchin', side ? walls.left + 16 : walls.right - 16, y));
    }
  }
  if (depthM > 60 && r() < Math.min(0.8, 0.3 + depthM / 400)) {
    const p = spot(r, seed, yAt(0.1, 0.9), 90);
    const walls = shaftWalls(seed, p.y);
    state.hazards.push(newHazard(id('ray', 0), 'ray', (walls.left + walls.right) / 2, p.y, { size: Math.max(40, (walls.right - walls.left) / 2 - 90), cooldown: between(r, 1, 4), phase: r() * 6 }));
  }
  if (depthM > 120) {
    const anglers = Math.min(3, Math.floor(r() * (1 + depthM / 150)));
    for (let i = 0; i < anglers; i++) {
      const p = spot(r, seed, yAt(0, 1), 70);
      state.hazards.push(newHazard(id('angler', i), 'angler', p.x, p.y, { phase: r() * 6 }));
    }
  }
  if (depthM > 150 && r() < 0.5) {
    const p = spot(r, seed, yAt(0.15, 0.85), 80);
    state.hazards.push(newHazard(id('toxic', 0), 'toxic', p.x, p.y, { size: between(r, 55, 75), phase: r() * 6 }));
  }
  if (depthM > 80) {
    const spikes = Math.floor(between(r, 0, 2.6));
    for (let i = 0; i < spikes; i++) {
      const y = yAt(0, 1);
      const walls = shaftWalls(seed, y);
      const left = r() < 0.5;
      state.hazards.push(newHazard(id('spikes', i), 'spikes', left ? walls.left - 2 : walls.right + 2, y, { angle: left ? 90 : -90, phase: r() * SPIKE_CYCLE }));
    }
  }
  if (depthM > 25) {
    const sharks = Math.min(4, 1 + Math.floor(r() * (1 + depthM / 160)));
    for (let i = 0; i < sharks; i++) {
      const y = yAt(0.1, 0.9);
      const walls = shaftWalls(seed, y);
      const center = (walls.left + walls.right) / 2;
      const hunter = r() < Math.min(0.9, 0.35 + depthM / 400);
      state.sharks.push(newShark(id('shark', i), sharkKindAt(r, depthM), center, y, Math.max(60, (walls.right - walls.left) / 2 - 90), hunter, r() * 10));
    }
  }
  if (depthM < 120) {
    const p = spot(r, seed, yAt(0.2, 0.8), 80);
    const walls = shaftWalls(seed, p.y);
    state.fish.push({ id: id('fish', 0), sprite: pick(r, FISH), x: p.x, y: p.y, vx: (r() < 0.5 ? -1 : 1) * between(r, 25, 45), minX: walls.left + 60, maxX: walls.right - 60, count: 3 + Math.floor(r() * 4), phase: r() * 6, size: between(r, 22, 32) });
  }
  thinThreats(state, sharkStart, hazardStart, shaftThreats(depthM), mulberry32(hash(seed, index, 4242)), 'y', SHAFT_ROW_GAP);
}

export function ensureShaft(state: GameState, cameraY: number, height: number) {
  const first = Math.max(0, Math.floor((cameraY - 200) / SHAFT_SEG));
  const last = Math.max(0, Math.floor((cameraY + height + SHAFT_SEG) / SHAFT_SEG));
  let added = false;
  for (let i = first; i <= last; i++) {
    if (state.shaftSegments.has(i)) continue;
    state.shaftSegments.add(i);
    generateSegment(state, i);
    added = true;
  }
  if (!added) return;
  const top = cameraY - KEEP_ABOVE;
  const below = <T extends { y: number }>(list: T[]) => list.filter((e) => e.y > top);
  state.sharks = below(state.sharks);
  state.hazards = below(state.hazards);
  state.coins = below(state.coins);
  state.fish = below(state.fish);
  state.airs = below(state.airs);
}

export function clampToShaft(state: GameState, x: number, y: number, margin: number): number {
  const walls = shaftWalls(state.seed, y);
  return Math.max(walls.left + margin, Math.min(walls.right - margin, x));
}

export function updateShaft(state: GameState, dt: number) {
  const { diver, stats } = state;
  for (const air of state.airs) air.phase += dt;
  if (state.phase !== 'dive' || diver.state !== 'diving') return;
  for (let i = state.airs.length - 1; i >= 0; i--) {
    const air = state.airs[i];
    if (Math.hypot(diver.x - air.x, diver.y - air.y) > AIR_RADIUS) continue;
    state.airs.splice(i, 1);
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * AIR_REFILL);
    floatText(state, '+ kyslík', air.x, air.y - 30, '#20D4E8');
    sfx(state, 'bubbles', 0.8);
    haptic(state, 'light');
  }
  const depthM = Math.floor(diver.y / PX_PER_M);
  const mark = Math.floor(depthM / 50) * 50;
  if (mark > 0 && mark > state.shaftMark) {
    state.shaftMark = mark;
    const record = mark > state.shaftBest;
    floatText(state, record ? `${mark} m – nový rekord!` : `${mark} m`, diver.x, diver.y - 70, record ? '#FFBF32' : '#FFFFFF');
    if (record) sfx(state, 'success', 0.5);
  }
}
