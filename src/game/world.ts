import type { SpriteName } from '../render/spriteAssets';
import { CHEST_CHANCE, CHEST_WEIGHTS, CHESTS, SHARK_HUNTER_CHANCE, SHARK_KINDS_BY_REGION, SHARKS } from './catalog';
import { CHUNK_W, SURFACE_SAFE } from './constants';
import { bossChunks, OCEAN_ORDER, oceanOf, type OceanId } from './oceans';
import { DEFAULT_FRONT, regionIndexAt, type Region } from './regions';
import { between, hash, mulberry32, pick, type Rng, weighted } from './rng';
import { seabedY } from './terrain';
import { SPIKE_CYCLE } from './systems/creatures';
import { CHUNK_THREATS, SEA_COLUMN_GAP, thinThreats } from './density';
import type { MaterialId } from './gear';
import { chunkProps } from './systems/props';
import type { Cave, Chest, ChestKind, Chunk, DecorItem, GameState, Hazard, HazardKind, Prop, Shark, SharkKind } from './types';

export const PROFILE_STEP = 24;

const spriteTop = (width: number) => width * 0.55;

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
  kelp: { sprite: 'kelp', min: 23, max: 31, sway: 1, sink: 4 },
  rock_big: { sprite: 'rock_big', min: 110, max: 160, sway: 0, sink: 16 },
  rock_small: { sprite: 'rock_small', min: 70, max: 96, sway: 0, sink: 8 },
  wreck: { sprite: 'wreck', min: 380, max: 440, sway: 0, sink: 40 },
  ruins: { sprite: 'ruins', min: 190, max: 250, sway: 0, sink: 14 },
  glow_coral: { sprite: 'glow_coral', min: 56, max: 84, sway: 0.2, sink: 6 },
  trench_vent: { sprite: 'trench_vent', min: 80, max: 120, sway: 0, sink: 10 },
  lava_vent: { sprite: 'lava_vent', min: 80, max: 120, sway: 0, sink: 10 },
  ice_block: { sprite: 'ice_block', min: 90, max: 140, sway: 0, sink: 14 },
  ice_crystal: { sprite: 'ice_crystal', min: 50, max: 80, sway: 0, sink: 6 },
  amphora: { sprite: 'amphora', min: 36, max: 52, sway: 0, sink: 6 },
  marble_column: { sprite: 'marble_column', min: 90, max: 140, sway: 0, sink: 10 },
  giant_kelp: { sprite: 'giant_kelp', min: 120, max: 200, sway: 0.6, sink: 6 },
  ghost_ship: { sprite: 'ghost_ship', min: 420, max: 480, sway: 0, sink: 40 },
  cave_crystal: { sprite: 'cave_crystal', min: 34, max: 56, sway: 0, sink: 6 },
  city_pillar: { sprite: 'city_pillar', min: 90, max: 140, sway: 0, sink: 10 },
  city_statue: { sprite: 'city_statue', min: 150, max: 200, sway: 0, sink: 12 },
  tidewarden: { sprite: 'tidewarden', min: 760, max: 840, sway: 0, sink: 150 },
};


const FISH: SpriteName[] = ['fish_clown', 'fish_yellow', 'fish_blue'];

function chestKindFor(r: Rng, regionId: number): ChestKind {
  return weighted<ChestKind>(r, CHEST_WEIGHTS[regionId]);
}

function createChest(r: Rng, seed: number, regions: Region[], id: string, x: number, kind: ChestKind, regionId: number): Chest {
  const info = CHESTS[kind];
  const restY = seabedY(seed, x, regions) - info.width * 0.32;
  const scale = (kind === 'heavy' ? 1 + regions[regionId].tier * 0.3 : 1) * (regions[regionId].lootScale ?? 1);
  return {
    id,
    kind,
    x,
    y: restY,
    restY,
    value: Math.round((between(r, info.min, info.max) * scale) / 5) * 5,
    regionId,
    falling: false,
    vy: 0,
    phase: r() * Math.PI * 2,
    pickupDelay: 0,
    boss: false,
    inCave: false,
    relic: null,
    rolled: false,
  };
}

export function newShark(id: string, kind: SharkKind, x: number, y: number, range: number, hunter: boolean, phase: number): Shark {
  const hp = SHARKS[kind].hp ?? 1;
  return {
    id,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    homeX: x,
    homeY: y,
    range,
    facing: -1,
    mode: 'patrol',
    timer: 0,
    hunter,
    phase,
    lungeCooldown: 0,
    alert: 0,
    turn: -1,
    tilt: 0,
    targetX: x,
    targetY: y,
    hp,
    maxHp: hp,
    dying: 0,
    hitFlash: 0,
    exposed: false,
  };
}

export function newHazard(id: string, kind: HazardKind, x: number, y: number, extra: Partial<Hazard> = {}): Hazard {
  return { id, kind, x, y, homeX: x, baseY: y, anchorY: y, size: 0, angle: 0, phase: 0, alive: true, dir: 1, timer: 0, cooldown: 0, state: 0, vx: 0, vy: 0, link: null, ...extra };
}

export const LEGENDARY_HP = 1.5;

export function bossChestValue(ocean: OceanId): number {
  const index = OCEAN_ORDER.indexOf(ocean);
  return 3000 + (index < 0 ? OCEAN_ORDER.length : index) * 1000;
}

export const isBossChunk = (state: GameState, index: number) => (state.variant === 'legendary' ? index === 3 || index === -4 : bossChunks(oceanOf(state)).includes(index));

function buildCave(r: Rng, seed: number, regions: Region[], x0: number): Cave | null {
  const bottom: number[] = [];
  const top: number[] = [];
  const thick = between(r, 110, 160);
  const gapBase = between(r, 105, 135);
  let valid = true;
  for (let i = 0; i * PROFILE_STEP <= CHUNK_W; i++) {
    const x = x0 + i * PROFILE_STEP;
    const t = (i * PROFILE_STEP) / CHUNK_W;
    const taper = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.08) / 0.84)))), 0.55);
    const floor = seabedY(seed, x, regions);
    const b = floor - gapBase - Math.sin(t * 7 + seed) * 12;
    const tp = b - thick * taper;
    if (b - SURFACE_SAFE < thick + 40) valid = false;
    bottom.push(b);
    top.push(tp);
  }
  if (!valid) return null;
  const mid = Math.round(bottom.length / 2);
  const pocket = r() < 0.7 ? { x: x0 + mid * PROFILE_STEP, y: bottom[mid], r: 54 } : null;
  return { x0, x1: x0 + CHUNK_W, bottom, top, pocket };
}

export function caveAt(state: GameState, x: number): { bottom: number; top: number; pocket: Cave['pocket']; cave: Cave } | null {
  const chunk = state.chunks.get(Math.floor(x / CHUNK_W));
  const cave = chunk?.cave;
  if (!cave) return null;
  const f = (x - cave.x0) / PROFILE_STEP;
  const i = Math.max(0, Math.min(cave.bottom.length - 2, Math.floor(f)));
  const k = Math.max(0, Math.min(1, f - i));
  const bottom = cave.bottom[i] + (cave.bottom[i + 1] - cave.bottom[i]) * k;
  const top = cave.top[i] + (cave.top[i + 1] - cave.top[i]) * k;
  if (bottom - top < 6) return null;
  return { bottom, top, pocket: cave.pocket, cave };
}

export function inPocket(pocket: Cave['pocket'], x: number, y: number): boolean {
  return !!pocket && Math.abs(x - pocket.x) < pocket.r && y < pocket.y + 10 && y > pocket.y - pocket.r;
}

function addDecor(list: DecorItem[], r: Rng, seed: number, regions: Region[], key: string, name: string, x: number, front = false) {
  const spec = DECOR[name];
  list.push({
    key,
    sprite: spec.sprite,
    x,
    y: seabedY(seed, x, regions) + spec.sink,
    width: between(r, spec.min, spec.max),
    flip: r() < 0.5,
    sway: spec.sway,
    front,
  });
}

function expansionChunk(state: GameState, index: number, x0: number, decor: DecorItem[], tier: number, regionId: number, cave: Cave | null, boss: boolean) {
  const { seed } = state;
  const ocean = oceanOf(state);
  const regions = ocean.regions;
  const r = mulberry32(hash(seed, index, 6262));
  const distance = Math.abs(index);
  const floorAt = (x: number) => seabedY(seed, x, regions);
  const near = (x: number) => state.props.some((p) => p.quest && Math.abs(p.x - x) < 140);
  if (cave && tier >= 2 && r() < (ocean.unstable ?? 0.25)) cave.unstable = true;
  if (distance > 1 && r() < 0.6) {
    const x = x0 + between(r, 60, CHUNK_W - 60);
    if (!near(x)) state.props.push(materialProp(state, `${index}:mat`, x, weighted<MaterialId>(r, ocean.materials), 1 + (tier >= 3 ? 1 : 0) + (r() < 0.3 ? 1 : 0)));
  }
  const wreck = decor.find((d) => d.sprite === 'wreck' || d.sprite === 'ghost_ship');
  if (wreck && r() < 0.8) {
    const x = wreck.x + (r() - 0.5) * wreck.width * 0.5;
    state.props.push(materialProp(state, `${index}:matw`, x, r() < 0.6 ? 'scrap' : 'rope', 2));
  }
  if (ocean.vents && distance > 0 && r() < 0.55) {
    const x = x0 + between(r, 80, CHUNK_W - 80);
    if (!near(x) && !cave) state.props.push({ id: `${index}:vent`, kind: 'vent', x, y: floorAt(x) - 6, lift: 6, quest: null, sprite: null, active: false, value: 0, taken: false, progress: r() * 8, phase: r() * 6 });
  }
  if (distance > 2 && !boss && !cave && tier >= 3 && r() < (ocean.heavy ?? 0.05)) {
    const x = x0 + between(r, 80, CHUNK_W - 80);
    state.chests.push(createChest(r, seed, regions, `${index}:heavy`, x, 'heavy', regionId));
  }
  if (distance > 2 && !boss && tier >= 2 && r() < (ocean.mimics ?? 0.08)) {
    const x = x0 + between(r, 60, CHUNK_W - 60);
    state.hazards.push(newHazard(`${index}:mimic`, 'mimic', x, floorAt(x) - 18, { anchorY: floorAt(x), phase: r() * 6 }));
  }
  const strait = ocean.id === 'riptide' || ocean.id === 'pacific';
  if (distance > 2 && tier >= 3 && strait && r() < (ocean.id === 'riptide' ? 0.45 : 0.18)) {
    const hy = between(r, SURFACE_SAFE + 60, floorAt(x0 + CHUNK_W / 2) - 100);
    state.hazards.push(newHazard(`${index}:barr`, 'barracuda', x0 + CHUNK_W / 2, hy, { size: 5 + Math.floor(r() * 3), dir: r() < 0.5 ? 1 : -1, phase: r() * 6, timer: between(r, 0, 1.5) }));
  }
  if (distance > 2 && tier >= 2 && (strait || ocean.id === 'wandering') && r() < 0.28) {
    const hx = x0 + between(r, 80, CHUNK_W - 80);
    const hy = between(r, SURFACE_SAFE + 80, floorAt(hx) - 140);
    state.hazards.push(newHazard(`${index}:siph`, 'siphon', hx, hy, { size: 4 + Math.floor(r() * 3), phase: r() * 6 }));
  }
  if (distance > 1 && tier >= 2 && (ocean.id === 'wandering' || ocean.id === 'pacific') && r() < 0.32) {
    const hx = x0 + between(r, 50, CHUNK_W - 50);
    state.hazards.push(newHazard(`${index}:pist`, 'pistol', hx, floorAt(hx) - 12, { dir: r() < 0.5 ? 1 : -1, anchorY: floorAt(hx), phase: r() * 6 }));
  }
  if (ocean.id === 'wandering' && distance > 1 && r() < 0.3) {
    const fy = between(r, 90, floorAt(x0 + CHUNK_W / 2) - 160);
    state.fish.push({ id: `${index}:young`, sprite: 'tidewarden_young', x: x0 + CHUNK_W / 2, y: fy, vx: (r() < 0.5 ? -1 : 1) * 22, minX: x0 - 300, maxX: x0 + CHUNK_W + 300, count: 1, phase: r() * 6, size: 120 });
  }
  if (ocean.id === 'riptide' && regionId === 2 && !boss && !cave && distance > 2 && index % 2 === 0) {
    const gx = x0 + CHUNK_W * 0.6;
    const id = `${index}:gate`;
    state.props.push({ id, kind: 'gate', x: gx, y: floorAt(gx), lift: 0, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: 'gate' });
    const lx = x0 + CHUNK_W * 0.22;
    state.props.push({ id: `${id}:lever`, kind: 'lever', x: lx, y: floorAt(lx) - 26, lift: 26, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: `gate:${id}` });
  }
  if (ocean.id === 'riptide' && regionId === 1) {
    const floor = floorAt(x0 + CHUNK_W / 2);
    state.currents.push({ id: `${index}:channel`, x0, x1: x0 + CHUNK_W, y0: SURFACE_SAFE + 40, y1: Math.min(floor - 70, SURFACE_SAFE + 260), force: 120, lift: 0, tidal: true });
  }
  if (boss && ocean.boss === 'hollow') {
    const center = x0 + CHUNK_W * 0.55;
    [-150, 0, 150].forEach((dx, i) => {
      const cx = center + dx;
      state.props.push({ id: `${index}:chain${i}`, kind: 'chain', x: cx, y: floorAt(cx) - 30, lift: 30, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: i, tag: 'boss' });
    });
  }
  if (boss && ocean.boss === 'maelstrom') {
    [0.15, 0.9].forEach((t, i) => {
      const lx = x0 + CHUNK_W * t;
      state.props.push({ id: `${index}:vortex${i}`, kind: 'lever', x: lx, y: floorAt(lx) - 26, lift: 26, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: 'vortex' });
    });
  }
  for (const rift of state.props.filter((p) => p.kind === 'rift' && Math.abs(p.x - (x0 + CHUNK_W / 2)) < CHUNK_W / 2)) {
    const count = 1 + (r() < 0.5 ? 1 : 0);
    for (let k = 0; k < count; k++) state.hazards.push(newHazard(`${index}:shadow${k}`, 'shadow', rift.x + (k === 0 ? -1 : 1) * 260, rift.y - 120, { phase: r() * 6, homeX: rift.x } as Partial<Hazard>));
  }
}

export function materialProp(state: GameState, id: string, x: number, material: MaterialId, amount: number): Prop {
  const y = seabedY(state.seed, x, oceanOf(state).regions) - 14;
  return { id, kind: 'material', x, y, lift: 14, quest: null, sprite: null, active: false, value: amount, taken: false, progress: 0, phase: (x % 7) + amount, tag: material };
}

export function generateChunk(state: GameState, index: number): Chunk {
  const { seed } = state;
  const ocean = oceanOf(state);
  const regions = ocean.regions;
  const x0 = index * CHUNK_W;
  const r = mulberry32(hash(seed, index, 7919));
  const sharkStart = state.sharks.length;
  const hazardStart = state.hazards.length;
  const center = x0 + CHUNK_W / 2;
  const regionId = regionIndexAt(regions, center);
  const region = regions[regionId];
  const tier = region.tier;
  const distance = Math.abs(index);

  const profile: number[] = [];
  for (let x = 0; x <= CHUNK_W; x += PROFILE_STEP) profile.push(seabedY(seed, x0 + x, regions));
  const top = Math.min(...profile) - 12;

  const decor: DecorItem[] = [];
  region.landmarks.forEach((landmark, i) => {
    if (r() < landmark.chance) {
      const margin = Math.min(140, DECOR[landmark.decor].max / 2);
      addDecor(decor, r, seed, regions, `${index}:lm${i}`, landmark.decor, x0 + between(r, margin, CHUNK_W - margin));
    }
  });
  const pool = region.decor;
  const decorCount = 4 + Math.floor(r() * 4);
  for (let i = 0; i < decorCount; i++) {
    addDecor(decor, r, seed, regions, `${index}:d${i}`, pick(r, pool), x0 + r() * CHUNK_W);
  }
  const frontCount = Math.floor(r() * 3);
  for (let i = 0; i < frontCount; i++) {
    addDecor(decor, r, seed, regions, `${index}:f${i}`, pick(r, region.front ?? DEFAULT_FRONT), x0 + r() * CHUNK_W, true);
  }
  const boss = isBossChunk(state, index);
  if (boss && !decor.some((d) => d.sprite === 'ruins')) addDecor(decor, r, seed, regions, `${index}:bossruins`, 'ruins', x0 + CHUNK_W * 0.3);
  decor.sort((a, b) => b.width - a.width);

  const hasWreck = decor.some((d) => d.sprite === 'wreck' || d.sprite === 'ruins');
  const questHere = state.props.some((p) => p.quest && Math.abs(p.x - center) < CHUNK_W);
  const cave = !boss && !questHere && distance > 3 && region.caves && r() < (region.caveChance ?? 0.24) ? buildCave(r, seed, regions, x0) : null;
  const gold = state.condition === 'gold';
  const chestChance = Math.min(0.95, CHEST_CHANCE[tier] + (gold ? 0.3 : 0));
  const chestsBefore = state.chests.length;

  if (boss) {
    const chest = createChest(r, seed, regions, `${index}:boss`, x0 + CHUNK_W * 0.55, 'legendary', regionId);
    chest.boss = true;
    chest.value = bossChestValue(ocean.id);
    state.chests.push(chest);
    const bossShark = newShark(`${index}:boss`, ocean.boss, chest.x + 200, chest.y - 150, 260, true, r() * 10);
    if (ocean.boss === 'maelstrom') {
      bossShark.homeX = chest.x;
      bossShark.homeY = chest.y - 300;
      bossShark.y = bossShark.homeY;
    }
    if (ocean.boss === 'hollow') {
      bossShark.homeX = chest.x + 60;
      bossShark.range = 200;
      bossShark.y = chest.y - 40;
    }
    if (state.variant === 'legendary') {
      bossShark.hp = Math.floor(bossShark.hp * LEGENDARY_HP);
      bossShark.maxHp = bossShark.hp;
      chest.value *= 2;
    }
    state.sharks.push(bossShark);
  } else if (cave) {
    const cx = x0 + between(r, CHUNK_W * 0.3, CHUNK_W * 0.7);
    const chest = createChest(r, seed, regions, `${index}:cave`, cx, chestKindFor(r, Math.min(CHEST_WEIGHTS.length - 1, tier + 1)), regionId);
    chest.inCave = true;
    state.chests.push(chest);
    const eelX = cave.x0 + CHUNK_W * (r() < 0.5 ? 0.2 : 0.8);
    const dir: 1 | -1 = eelX < cave.x0 + CHUNK_W / 2 ? 1 : -1;
    state.hazards.push(newHazard(`${index}:eel`, 'eel', eelX, seabedY(seed, eelX, regions) - 26, { dir, phase: r() * 6 }));
  } else if (distance === 1) {
    state.chests.push(createChest(r, seed, regions, `${index}:c0`, x0 + (index > 0 ? 260 : CHUNK_W - 260), 'common', 0));
  } else if (distance > 1 && r() < chestChance) {
    const kind = hasWreck && r() < 0.5 ? chestKindFor(r, Math.min(CHEST_WEIGHTS.length - 1, tier + 1)) : chestKindFor(r, tier);
    state.chests.push(createChest(r, seed, regions, `${index}:c0`, x0 + between(r, 60, CHUNK_W - 60), kind, regionId));
    if (tier >= 3 && r() < 0.25) {
      state.chests.push(createChest(r, seed, regions, `${index}:c1`, x0 + between(r, 60, CHUNK_W - 60), chestKindFor(r, tier), regionId));
    }
  }

  if (distance > 2 && tier >= 1 && !boss) {
    const target = state.chests.slice(chestsBefore).find((c) => !c.inCave && !c.boss);
    if (target && r() < 0.18 + tier * 0.05) {
      state.hazards.push(newHazard(`${index}:crab`, 'crab', target.x, target.y - 20, { link: target.id, dir: r() < 0.5 ? 1 : -1, timer: between(r, 1.5, 3) }));
    }
  }

  if (distance > 0) {
    const coinGroups = (r() < 0.65 ? 1 : 0) * (gold ? 2 : 1);
    for (let g = 0; g < coinGroups; g++) {
      const cx = x0 + between(r, 80, CHUNK_W - 80);
      const floor = seabedY(seed, cx, regions);
      const cy = between(r, Math.min(floor - 60, 90), floor - 50);
      const count = 3 + Math.floor(r() * 4);
      for (let c = 0; c < count; c++) {
        const angle = (c / Math.max(1, count - 1)) * Math.PI;
        state.coins.push({
          id: `${index}:k${g}:${c}`,
          x: cx + (c - count / 2) * 26,
          y: cy - Math.sin(angle) * 26,
          value: 5 + tier * 3,
          phase: r() * Math.PI * 2,
        });
      }
    }
  }

  if (distance > 2 && tier > 0 && !boss) {
    const sharkCount = tier === 1 ? (r() < 0.45 ? 1 : 0) : 1 + (r() < 0.25 + tier * 0.08 ? 1 : 0);
    for (let s = 0; s < sharkCount; s++) {
      const kind = weighted<SharkKind>(r, region.sharks ?? ocean.sharks ?? SHARK_KINDS_BY_REGION[tier]);
      const sx = x0 + between(r, 40, CHUNK_W - 40);
      const floor = seabedY(seed, sx, regions);
      const big = kind === 'great' || kind === 'deep';
      const minY = big ? Math.max(SURFACE_SAFE + 80, floor * 0.45) : SURFACE_SAFE + 50;
      const sy = between(r, minY, Math.max(minY + 10, floor - 60));
      state.sharks.push(newShark(`${index}:s${s}`, kind, sx, sy, between(r, 140, 300), r() < SHARK_HUNTER_CHANCE[tier], r() * 10));
    }
    const guarded = state.chests.filter((c) => c.id.startsWith(`${index}:`) && (c.kind === 'epic' || c.kind === 'legendary'));
    for (const chest of guarded) {
      const kind: SharkKind = tier >= 4 ? 'deep' : 'great';
      if (chest.boss) continue;
      const guard = newShark(`${chest.id}:guard`, kind, chest.x + 120, chest.y - 90, 130, true, r() * 10);
      guard.homeX = chest.x;
      state.sharks.push(guard);
    }
  }

  if (distance > 2 && tier >= 1 && r() < 0.25 + tier * 0.08) {
    const count = 1 + Math.floor(r() * 2);
    for (let j = 0; j < count; j++) {
      const hx = x0 + between(r, 40, CHUNK_W - 40);
      const floor = seabedY(seed, hx, regions);
      const hy = between(r, SURFACE_SAFE + 40, floor - 70);
      state.hazards.push(newHazard(`${index}:j${j}`, 'jelly', hx, hy, { phase: r() * 6 }));
    }
  }
  if (distance > 2 && tier >= 3 && r() < 0.4) {
    const hx = x0 + between(r, 60, CHUNK_W - 60);
    const floor = seabedY(seed, hx, regions);
    const hy = floor - between(r, 90, Math.min(260, floor - SURFACE_SAFE - 40));
    state.hazards.push(newHazard(`${index}:m`, 'mine', hx, hy, { anchorY: floor, phase: r() * 6 }));
  }
  if (distance > 1 && tier >= 2 && r() < 0.45) {
    const hx = x0 + between(r, 30, CHUNK_W - 30);
    const floor = seabedY(seed, hx, regions);
    state.hazards.push(newHazard(`${index}:u`, 'urchin', hx, floor - 10, { anchorY: floor }));
  }
  if (distance > 2 && tier >= 2 && r() < 0.2 + tier * 0.04) {
    const hx = x0 + between(r, 60, CHUNK_W - 60);
    const hy = between(r, SURFACE_SAFE + 60, seabedY(seed, hx, regions) - 90);
    state.hazards.push(newHazard(`${index}:o`, 'octopus', hx, hy, { phase: r() * 6 }));
  }
  if (distance > 2 && tier >= 4 && r() < 0.3 + (tier - 4) * 0.15) {
    const hx = x0 + between(r, 80, CHUNK_W - 80);
    const floor = seabedY(seed, hx, regions);
    state.hazards.push(newHazard(`${index}:ang`, 'angler', hx, floor - between(r, 90, 170), { phase: r() * 6 }));
  }
  if (distance > 2 && tier >= 3 && r() < 0.28) {
    const hx = x0 + CHUNK_W / 2;
    const floor = seabedY(seed, hx, regions);
    state.hazards.push(newHazard(`${index}:ray`, 'ray', hx, between(r, SURFACE_SAFE + 80, floor - 80), { size: between(r, 80, 150), cooldown: between(r, 1, 4), phase: r() * 6 }));
  }
  if (distance > 3 && tier >= 4 && r() < 0.22) {
    const hx = x0 + between(r, 100, CHUNK_W - 100);
    const floor = seabedY(seed, hx, regions);
    state.hazards.push(newHazard(`${index}:tox`, 'toxic', hx, floor - between(r, 80, 160), { size: between(r, 60, 85), phase: r() * 6 }));
  }
  if (distance > 1 && tier >= 2 && !cave && r() < 0.22) {
    const hx = x0 + between(r, 40, CHUNK_W - 40);
    state.hazards.push(newHazard(`${index}:spk`, 'spikes', hx, seabedY(seed, hx, regions) + 2, { phase: r() * SPIKE_CYCLE }));
  }
  for (const vent of decor.filter((d) => d.sprite === 'trench_vent' || d.sprite === 'lava_vent')) {
    const top = vent.y - spriteTop(vent.width) * 1.6;
    state.currents.push({ id: `${index}:${vent.key}`, x0: vent.x - 32, x1: vent.x + 32, y0: Math.max(SURFACE_SAFE, top - 380), y1: top + 20, force: 0, lift: -170 });
  }
  const wreck = decor.find((d) => d.sprite === 'wreck');
  if (wreck) {
    for (let k = 0; k < 2; k++) {
      const dx = wreck.x + (k === 0 ? -1 : 1) * wreck.width * 0.2;
      const dy = wreck.y - spriteTop(wreck.width) - 30;
      state.hazards.push(newHazard(`${index}:deb${k}`, 'debris', dx, dy, { anchorY: dy, phase: r() * 6, timer: between(r, 0, 2) }));
    }
  }
  if (distance > 2 && tier >= 2 && !cave && r() < 0.18) {
    const rock = decor.find((d) => d.sprite === 'rock_big');
    if (rock) {
      const dir: 1 | -1 = r() < 0.5 ? 1 : -1;
      state.hazards.push(newHazard(`${index}:eelr`, 'eel', rock.x + dir * rock.width * 0.3, rock.y - rock.width * 0.25, { dir, phase: r() * 6 }));
    }
  }

  const flow = ocean.currents ?? 1;
  if (distance > 3 && (tier >= 2 || flow > 1) && r() < Math.min(0.7, 0.22 * flow)) {
    const floor = seabedY(seed, center, regions);
    const y0 = between(r, SURFACE_SAFE + 30, floor * 0.6);
    state.currents.push({ id: `${index}:cur`, x0, x1: x0 + CHUNK_W, y0, y1: y0 + between(r, 90, 160), force: (r() < 0.5 ? -1 : 1) * between(r, 50, 85) * Math.min(1.5, Math.sqrt(flow)), lift: 0, tidal: (ocean.tide?.strength ?? 0) >= 0.6 });
  }

  if (distance > 1 && region.whales && r() < region.whales) {
    state.fish.push({ id: `${index}:whale`, sprite: 'whale', x: center, y: between(r, 90, Math.max(120, seabedY(seed, center, regions) - 220)), vx: (r() < 0.5 ? -1 : 1) * 28, minX: x0 - 600, maxX: x0 + CHUNK_W + 600, count: 1, phase: r() * 6, size: 230 });
  }

  if (tier <= 3 && !ocean.darkness && r() < (state.condition === 'night' ? 0.3 : 0.8)) {
    const fy = between(r, 50, seabedY(seed, center, regions) - 60);
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

  if (cave) {
    const inRock = (x: number, y: number) => {
      const i = Math.round((x - cave.x0) / PROFILE_STEP);
      if (i < 0 || i >= cave.bottom.length) return false;
      return y > cave.top[i] - 30 && y < cave.bottom[i] + 30 && cave.bottom[i] - cave.top[i] > 6;
    };
    const prefix = `${index}:`;
    state.coins = state.coins.filter((c) => !c.id.startsWith(prefix) || !inRock(c.x, c.y));
    state.hazards = state.hazards.filter((h) => !h.id.startsWith(prefix) || !['jelly', 'mine', 'octopus'].includes(h.kind) || !inRock(h.x, h.y));
    state.fish = state.fish.filter((f) => !f.id.startsWith(prefix) || !inRock(f.x, f.y));
  }

  if (state.expansion && state.mode === 'sea') expansionChunk(state, index, x0, decor, tier, regionId, cave, boss);
  thinThreats(state, sharkStart, hazardStart, CHUNK_THREATS[tier], mulberry32(hash(seed, index, 4242)), 'x', SEA_COLUMN_GAP);
  chunkProps(state, index, x0, decor, tier, mulberry32(hash(seed, index, 5151)));

  if (state.variant === 'free') {
    const own = (id: string) => id.startsWith(`${index}:`);
    state.chests = state.chests.filter((c) => !own(c.id));
    state.sharks = state.sharks.filter((c) => !own(c.id));
    state.hazards = state.hazards.filter((c) => !own(c.id));
    state.coins = state.coins.filter((c) => !own(c.id));
    state.props = state.props.filter((p) => !own(p.id) || p.kind === 'vent' || p.kind === 'gate' || (p.kind === 'lever' && !!p.tag?.startsWith('gate:')));
  }
  return { index, x0, decor, profile, top, regionId, palette: { sand: region.sand, sandDark: region.sandDark, sandEdge: region.sandEdge }, cave, boss };
}

export function ensureChunks(state: GameState, centerX: number, halfWidth: number) {
  const first = Math.floor((centerX - halfWidth - CHUNK_W) / CHUNK_W);
  const last = Math.floor((centerX + halfWidth + CHUNK_W) / CHUNK_W);
  for (let i = first; i <= last; i++) {
    if (!state.chunks.has(i)) state.chunks.set(i, generateChunk(state, i));
  }
}
