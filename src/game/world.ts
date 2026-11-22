import type { SpriteName } from '../render/spriteAssets';
import { CHEST_CHANCE, CHEST_WEIGHTS, CHESTS, SHARK_HUNTER_CHANCE, SHARK_KINDS_BY_REGION } from './catalog';
import { CHUNK_W, SURFACE_SAFE } from './constants';
import { regionIndexAt } from './regions';
import { between, hash, mulberry32, pick, type Rng, weighted } from './rng';
import { seabedY } from './terrain';
import type { Chest, ChestKind, Chunk, DecorItem, GameState, SharkKind } from './types';

export const PROFILE_STEP = 24;

interface DecorSpec {
  sprite: SpriteName;
  min: number;
  max: number;
  sway: number;
  sink: number;
}

const DECOR: Record<string, DecorSpec> = {
  coral_pink: { sprite: 'coral_pink', min: 58, max: 86, sway: 0.4, sink: 6 },
  coral_orange: { sprite: 'coral_orange', min: 60, max: 92, sway: 0.4, sink: 6 },
  coral_purple: { sprite: 'coral_purple', min: 56, max: 84, sway: 0.2, sink: 6 },
  seaweed: { sprite: 'seaweed', min: 34, max: 52, sway: 1, sink: 4 },
  kelp: { sprite: 'kelp', min: 34, max: 46, sway: 1, sink: 4 },
  rock_big: { sprite: 'rock_big', min: 110, max: 160, sway: 0, sink: 16 },
  rock_small: { sprite: 'rock_small', min: 70, max: 96, sway: 0, sink: 8 },
  wreck: { sprite: 'wreck', min: 380, max: 440, sway: 0, sink: 40 },
  ruins: { sprite: 'ruins', min: 190, max: 250, sway: 0, sink: 14 },
};

const DECOR_POOLS: string[][] = [
  ['coral_pink', 'coral_orange', 'seaweed', 'seaweed', 'rock_small', 'coral_pink', 'kelp'],
  ['coral_pink', 'coral_orange', 'coral_purple', 'seaweed', 'rock_big', 'rock_small', 'kelp'],
  ['rock_big', 'seaweed', 'kelp', 'coral_orange', 'rock_small', 'coral_purple'],
  ['rock_big', 'kelp', 'seaweed', 'rock_small', 'kelp'],
  ['rock_big', 'kelp', 'coral_purple', 'rock_small'],
  ['rock_big', 'coral_purple', 'kelp', 'rock_small'],
];

const FISH: SpriteName[] = ['fish_clown', 'fish_yellow', 'fish_blue'];

function chestKindFor(r: Rng, regionId: number): ChestKind {
  return weighted<ChestKind>(r, CHEST_WEIGHTS[regionId]);
}

function createChest(r: Rng, seed: number, id: string, x: number, kind: ChestKind, regionId: number): Chest {
  const info = CHESTS[kind];
  const restY = seabedY(seed, x) - info.width * 0.32;
  return {
    id,
    kind,
    x,
    y: restY,
    restY,
    value: Math.round(between(r, info.min, info.max) / 5) * 5,
    regionId,
    falling: false,
    vy: 0,
    phase: r() * Math.PI * 2,
    pickupDelay: 0,
  };
}

function addDecor(list: DecorItem[], r: Rng, seed: number, key: string, name: string, x: number, front = false) {
  const spec = DECOR[name];
  list.push({
    key,
    sprite: spec.sprite,
    x,
    y: seabedY(seed, x) + spec.sink,
    width: between(r, spec.min, spec.max),
    flip: r() < 0.5,
    sway: spec.sway,
    front,
  });
}

export function generateChunk(state: GameState, index: number): Chunk {
  const { seed } = state;
  const x0 = index * CHUNK_W;
  const r = mulberry32(hash(seed, index, 7919));
  const center = x0 + CHUNK_W / 2;
  const regionId = regionIndexAt(center);
  const distance = Math.abs(index);

  const profile: number[] = [];
  for (let x = 0; x <= CHUNK_W; x += PROFILE_STEP) profile.push(seabedY(seed, x0 + x));
  const top = Math.min(...profile) - 12;

  const decor: DecorItem[] = [];
  if (regionId === 3 && r() < 0.5) addDecor(decor, r, seed, `${index}:wreck`, 'wreck', x0 + between(r, 140, CHUNK_W - 140));
  if (regionId === 5 && r() < 0.55) addDecor(decor, r, seed, `${index}:ruins`, 'ruins', x0 + between(r, 100, CHUNK_W - 100));
  if (regionId === 4 && r() < 0.15) addDecor(decor, r, seed, `${index}:ruins`, 'ruins', x0 + between(r, 100, CHUNK_W - 100));
  const pool = DECOR_POOLS[regionId];
  const decorCount = 4 + Math.floor(r() * 4);
  for (let i = 0; i < decorCount; i++) {
    addDecor(decor, r, seed, `${index}:d${i}`, pick(r, pool), x0 + r() * CHUNK_W);
  }
  const frontCount = Math.floor(r() * 3);
  for (let i = 0; i < frontCount; i++) {
    addDecor(decor, r, seed, `${index}:f${i}`, pick(r, ['seaweed', 'coral_pink', 'coral_orange', 'rock_small']), x0 + r() * CHUNK_W, true);
  }
  decor.sort((a, b) => b.width - a.width);

  const hasWreck = decor.some((d) => d.sprite === 'wreck' || d.sprite === 'ruins');

  if (distance === 1) {
    state.chests.push(createChest(r, seed, `${index}:c0`, x0 + (index > 0 ? 260 : CHUNK_W - 260), 'common', 0));
  } else if (distance > 1 && r() < CHEST_CHANCE[regionId]) {
    const kind = hasWreck && r() < 0.5 ? chestKindFor(r, Math.min(5, regionId + 1)) : chestKindFor(r, regionId);
    state.chests.push(createChest(r, seed, `${index}:c0`, x0 + between(r, 60, CHUNK_W - 60), kind, regionId));
    if (regionId >= 3 && r() < 0.25) {
      state.chests.push(createChest(r, seed, `${index}:c1`, x0 + between(r, 60, CHUNK_W - 60), chestKindFor(r, regionId), regionId));
    }
  }

  if (distance > 0) {
    const coinGroups = r() < 0.65 ? 1 : 0;
    for (let g = 0; g < coinGroups; g++) {
      const cx = x0 + between(r, 80, CHUNK_W - 80);
      const floor = seabedY(seed, cx);
      const cy = between(r, Math.min(floor - 60, 90), floor - 50);
      const count = 3 + Math.floor(r() * 4);
      for (let c = 0; c < count; c++) {
        const angle = (c / Math.max(1, count - 1)) * Math.PI;
        state.coins.push({
          id: `${index}:k${g}:${c}`,
          x: cx + (c - count / 2) * 26,
          y: cy - Math.sin(angle) * 26,
          value: 5 + regionId * 3,
          phase: r() * Math.PI * 2,
        });
      }
    }
  }

  if (distance > 2 && regionId > 0) {
    const sharkCount = regionId === 1 ? (r() < 0.45 ? 1 : 0) : 1 + (r() < 0.25 + regionId * 0.08 ? 1 : 0);
    for (let s = 0; s < sharkCount; s++) {
      const kind = weighted<SharkKind>(r, SHARK_KINDS_BY_REGION[regionId]);
      const sx = x0 + between(r, 40, CHUNK_W - 40);
      const floor = seabedY(seed, sx);
      const big = kind === 'great' || kind === 'deep';
      const minY = big ? Math.max(SURFACE_SAFE + 80, floor * 0.45) : SURFACE_SAFE + 50;
      const sy = between(r, minY, Math.max(minY + 10, floor - 60));
      state.sharks.push({
        id: `${index}:s${s}`,
        kind,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        homeX: sx,
        homeY: sy,
        range: between(r, 140, 300),
        facing: r() < 0.5 ? 1 : -1,
        mode: 'patrol',
        timer: 0,
        hunter: r() < SHARK_HUNTER_CHANCE[regionId],
        phase: r() * 10,
        lungeCooldown: 0,
        alert: 0,
        turn: 1,
        tilt: 0,
      });
    }
    const guarded = state.chests.filter((c) => c.id.startsWith(`${index}:`) && (c.kind === 'epic' || c.kind === 'legendary'));
    for (const chest of guarded) {
      const kind: SharkKind = regionId >= 4 ? 'deep' : 'great';
      state.sharks.push({
        id: `${chest.id}:guard`,
        kind,
        x: chest.x + 120,
        y: chest.y - 90,
        vx: 0,
        vy: 0,
        homeX: chest.x,
        homeY: chest.y - 90,
        range: 130,
        facing: -1,
        mode: 'patrol',
        timer: 0,
        hunter: true,
        phase: r() * 10,
        lungeCooldown: 0,
        alert: 0,
        turn: 1,
        tilt: 0,
      });
    }
  }

  if (distance > 2 && regionId >= 1 && r() < 0.25 + regionId * 0.08) {
    const count = 1 + Math.floor(r() * 2);
    for (let j = 0; j < count; j++) {
      const hx = x0 + between(r, 40, CHUNK_W - 40);
      const floor = seabedY(seed, hx);
      const hy = between(r, SURFACE_SAFE + 40, floor - 70);
      state.hazards.push({ id: `${index}:j${j}`, kind: 'jelly', x: hx, y: hy, baseY: hy, anchorY: hy, phase: r() * 6, alive: true });
    }
  }
  if (distance > 2 && regionId >= 3 && r() < 0.4) {
    const hx = x0 + between(r, 60, CHUNK_W - 60);
    const floor = seabedY(seed, hx);
    const hy = floor - between(r, 90, Math.min(260, floor - SURFACE_SAFE - 40));
    state.hazards.push({ id: `${index}:m`, kind: 'mine', x: hx, y: hy, baseY: hy, anchorY: floor, phase: r() * 6, alive: true });
  }
  if (distance > 1 && regionId >= 2 && r() < 0.45) {
    const hx = x0 + between(r, 30, CHUNK_W - 30);
    const floor = seabedY(seed, hx);
    state.hazards.push({ id: `${index}:u`, kind: 'urchin', x: hx, y: floor - 10, baseY: floor - 10, anchorY: floor, phase: 0, alive: true });
  }

  if (distance > 3 && regionId >= 2 && r() < 0.22) {
    const floor = seabedY(seed, center);
    const y0 = between(r, SURFACE_SAFE + 30, floor * 0.6);
    state.currents.push({ id: `${index}:cur`, x0, x1: x0 + CHUNK_W, y0, y1: y0 + between(r, 90, 160), force: (r() < 0.5 ? -1 : 1) * between(r, 50, 85) });
  }

  if (regionId <= 3 && r() < 0.8) {
    const fy = between(r, 50, seabedY(seed, center) - 60);
    state.fish.push({
      id: `${index}:fish`,
      sprite: pick(r, FISH),
      x: center,
      y: fy,
      vx: (r() < 0.5 ? -1 : 1) * between(r, 25, 45),
      minX: x0 - 100,
      maxX: x0 + CHUNK_W + 100,
      count: 3 + Math.floor(r() * 4),
      phase: r() * 6,
      size: between(r, 22, 32),
    });
  }

  return { index, x0, decor, profile, top, regionId };
}

export function ensureChunks(state: GameState, centerX: number, halfWidth: number) {
  const first = Math.floor((centerX - halfWidth - CHUNK_W) / CHUNK_W);
  const last = Math.floor((centerX + halfWidth + CHUNK_W) / CHUNK_W);
  for (let i = first; i <= last; i++) {
    if (!state.chunks.has(i)) state.chunks.set(i, generateChunk(state, i));
  }
}
