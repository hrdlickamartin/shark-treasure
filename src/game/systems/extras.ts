import { SHARKS } from '../catalog';
import { CHUNK_W, MAX_HEALTH, PX_PER_M, SURFACE_SAFE } from '../constants';
import type { GameState, HarpoonTarget, Hazard, Shark } from '../types';
import { oceanOf } from '../oceans';
import { floorAt } from '../terrain';
import { caveAt } from '../world';
import { ellipseHit } from './collision';
import { burst, floatText, haptic, sfx, shake } from './effects';
import { bossVulnerable, deflectHarpoon } from './bosses';

export const BALLOON_HAUL_RANGE = 1100;
export const MEDKIT_HEAL = 50;
export const BOOST_SPEED = 1.75;

export const scooterFor = (level: number) => ({ time: 1.5 + level * 0.5, cooldown: Math.max(6, 16 - level * 2) });

export const HARPOON_RANGE = 320;
export const SUB_RADIUS = 80;

export const submarineDepthM = (level: number) => (level ? 10 + level * 15 : 0);

export const BELL_DEPTH = 250;
export const BELL_RADIUS = 70;

export function bellSpot(state: GameState): { x: number; y: number } | null {
  if (!state.stats.bell) return null;
  const x = state.boat.x - 110;
  return { x, y: Math.min(BELL_DEPTH, floorAt(state, x) - 70) };
}

export function submarineSpot(state: GameState): { x: number; y: number } | null {
  if (state.stats.submarine <= 0) return null;
  const x = state.boat.x + 140;
  const y = Math.min(submarineDepthM(state.stats.submarine) * PX_PER_M, floorAt(state, x) - 90);
  return { x, y };
}

const HARPOON_PREY = new Set(['jelly', 'octopus', 'eel', 'crab', 'angler', 'ray', 'barracuda', 'pistol', 'siphon']);
const NET_PREY = new Set(['jelly', 'octopus', 'eel', 'crab', 'ray', 'pistol', 'barracuda']);

const preyable = (h: Hazard) => h.alive && (HARPOON_PREY.has(h.kind) || (h.kind === 'shadow' && h.state === 1));
export const HARPOON_SPEED = 1100;
export const HARPOON_COOLDOWN = 0.7;
export const SHARK_DEATH_TIME = 1.4;
export const BOSS_DEATH_TIME = 2.2;

export function harpoonTarget(state: GameState): HarpoonTarget | null {
  const { diver } = state;
  let best: HarpoonTarget | null = null;
  let bestD = HARPOON_RANGE * state.stats.harpoonRange;
  const consider = (kind: HarpoonTarget['kind'], id: string, x: number, y: number, reach: number, boss: boolean) => {
    const dx = (x - diver.x) * diver.facing;
    const dy = Math.abs(y - diver.y);
    const d = Math.hypot(dx, dy) - reach;
    if (dx < -20 || dy > 150 + reach * 0.5 || d >= bestD) return;
    bestD = d;
    best = { kind, id, x, y, boss };
  };
  for (const shark of state.sharks) {
    if (shark.dying) continue;
    const info = SHARKS[shark.kind];
    consider('shark', shark.id, shark.x, shark.y, info.width * 0.3, !!info.boss);
  }
  for (const h of state.hazards) {
    if (preyable(h)) consider('hazard', h.id, h.x, h.y, 20, false);
  }
  return best;
}

export function fireHarpoon(state: GameState) {
  const { diver } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || diver.harpoons <= 0 || state.harpoonCooldown > 0) return;
  state.harpoonCooldown = HARPOON_COOLDOWN;
  const target = harpoonTarget(state);
  const sx = diver.x + diver.facing * 34;
  const sy = diver.y + 4;
  const range = HARPOON_RANGE * state.stats.harpoonRange;
  const tx = target ? target.x : sx + diver.facing * range;
  const ty = target ? target.y : sy;
  const len = Math.hypot(tx - sx, ty - sy) || 1;
  state.harpoonShots.push({
    id: ++state.entityId,
    x: sx,
    y: sy,
    vx: ((tx - sx) / len) * HARPOON_SPEED,
    vy: ((ty - sy) / len) * HARPOON_SPEED,
    life: target ? 1.2 : range / HARPOON_SPEED,
    target: target ? { kind: target.kind, id: target.id } : null,
  });
  burst(state, 'bubble', sx, sy, 8, 90, 0.6, 5);
  diver.vx -= diver.facing * 60;
  sfx(state, 'zap', 0.6);
  haptic(state, 'light');
  if (!target) {
    floatText(state, 'Nic v dosahu', diver.x, diver.y - 50, '#A9C8EC');
    return;
  }
  diver.harpoons -= 1;
}

function hitShark(state: GameState, shark: Shark) {
  const info = SHARKS[shark.kind];
  if (!bossVulnerable(state, shark)) {
    deflectHarpoon(state, shark);
    return;
  }
  shark.hp -= 1;
  shark.hitFlash = 0.35;
  shark.alert = 0;
  burst(state, 'spark', shark.x, shark.y, 14, 160, 0.5, 6);
  burst(state, 'boom', shark.x, shark.y, 6, 90, 0.45, 12);
  sfx(state, 'mine', 0.7);
  haptic(state, 'heavy');
  shake(state, info.boss ? 12 : 6);
  if (shark.hp > 0) {
    shark.mode = 'tired';
    shark.timer = 2.5;
    shark.vx *= 0.2;
    shark.vy *= 0.2;
    floatText(state, `Zásah! Zbývá ${shark.hp}×`, shark.x, shark.y - 70, '#FFBF32');
    return;
  }
  shark.dying = info.boss ? BOSS_DEATH_TIME : SHARK_DEATH_TIME;
  if (info.boss) state.record.discoveries.push(`defeated:${shark.kind}`);
  shark.mode = 'tired';
  shark.vx = 0;
  shark.vy = 0;
  floatText(state, info.boss ? `${info.name} poražen!` : 'Zásah!', shark.x, shark.y - 60, '#FFBF32');
  if (info.boss) {
    state.events.push({ type: 'toast', text: `${info.name} je poražen! Poklad je tvůj.` });
    sfx(state, 'success', 0.9);
  }
}

function hitHazard(state: GameState, hazard: Hazard) {
  hazard.alive = false;
  if (state.stats.net && NET_PREY.has(hazard.kind)) {
    const tag = `net:${hazard.kind}`;
    if (!state.record.scans.includes(tag)) state.record.scans.push(tag);
    const existing = state.record.photos.find((p) => p.species === hazard.kind);
    if (existing) existing.stars = 3;
    else state.record.photos.push({ species: hazard.kind, stars: 3 });
    burst(state, 'bubble', hazard.x, hazard.y, 12, 80, 1, 6);
    floatText(state, 'Chyceno do sítě!', hazard.x, hazard.y - 40, '#20D4E8');
    sfx(state, 'collect', 0.7);
    haptic(state, 'success');
    return;
  }
  burst(state, 'spark', hazard.x, hazard.y, 10, 130, 0.45, 5);
  burst(state, 'bubble', hazard.x, hazard.y, 10, 80, 1, 6);
  floatText(state, 'Zásah!', hazard.x, hazard.y - 40, '#FFBF32');
  sfx(state, 'mine', 0.5);
  haptic(state, 'heavy');
}

function updateHarpoons(state: GameState, dt: number) {
  state.harpoonCooldown = Math.max(0, state.harpoonCooldown - dt);
  for (let i = state.harpoonShots.length - 1; i >= 0; i--) {
    const shot = state.harpoonShots[i];
    shot.life -= dt;
    const shark = shot.target?.kind === 'shark' ? state.sharks.find((s) => s.id === shot.target!.id && !s.dying) : undefined;
    const hazard = shot.target?.kind === 'hazard' ? state.hazards.find((h) => h.id === shot.target!.id && h.alive) : undefined;
    const goal = shark ?? hazard;
    if (goal) {
      const dx = goal.x - shot.x;
      const dy = goal.y - shot.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = shark ? SHARKS[shark.kind].width * 0.3 : 26;
      if (d <= reach + HARPOON_SPEED * dt) {
        state.harpoonShots.splice(i, 1);
        if (shark) hitShark(state, shark);
        else if (hazard) hitHazard(state, hazard);
        continue;
      }
      shot.vx = (dx / d) * HARPOON_SPEED;
      shot.vy = (dy / d) * HARPOON_SPEED;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (Math.random() < dt * 30) state.particles.push({ kind: 'bubble', x: shot.x, y: shot.y, vx: 0, vy: -30, life: 0.5, maxLife: 0.5, size: 4 });
    if (shot.life <= 0) {
      state.harpoonShots.splice(i, 1);
      burst(state, 'bubble', shot.x, shot.y, 5, 50, 0.6, 4);
    }
  }
  const { diver } = state;
  const aiming = state.phase === 'dive' && diver.state === 'diving' && diver.harpoons > 0;
  state.harpoonAim = aiming ? harpoonTarget(state) : null;
  if (state.harpoonAim) discover(state, 'harpoon', 'Cíl na mušce! Vystřel harpunou.');
}

const PHOTO_HAZARDS = new Set(['jelly', 'octopus', 'eel', 'crab', 'urchin', 'ray', 'angler', 'barracuda', 'siphon', 'pistol', 'mimic', 'shadow']);

function sharkBehavior(shark: Shark): string | undefined {
  if (shark.mode === 'lunge' || shark.mode === 'charge') return 'attack';
  if (shark.mode === 'telegraph') return 'warning';
  return undefined;
}

function hazardBehavior(h: Hazard): string | undefined {
  if (h.kind === 'ray' && h.state >= 1) return 'discharge';
  if (h.kind === 'pistol' && h.state >= 1) return 'shot';
  if (h.kind === 'eel' && h.state >= 1) return 'attack';
  if (h.kind === 'mimic' && h.state === 1) return 'revealed';
  return undefined;
}

export const photoRange = (camera: number) => (camera ? 260 + camera * 60 : 0);

interface PhotoTarget {
  species: string;
  x: number;
  y: number;
  stars: number;
  behavior?: string;
}

function photoTarget(state: GameState): PhotoTarget | null {
  const { diver, stats } = state;
  const range = photoRange(stats.camera);
  const candidates: { species: string; x: number; y: number; calm: boolean; behavior?: string }[] = [
    ...state.sharks.filter((s) => !s.dying).map((s) => ({ species: s.kind as string, x: s.x, y: s.y, calm: s.mode === 'patrol' || s.mode === 'tired', behavior: sharkBehavior(s) })),
    ...state.hazards
      .filter((h) => h.alive && PHOTO_HAZARDS.has(h.kind) && (h.kind !== 'mimic' || h.state > 0) && (h.kind !== 'shadow' || h.state > 0))
      .map((h) => ({ species: h.kind as string, x: h.x, y: h.y, calm: h.state === 0, behavior: hazardBehavior(h) })),
    ...state.fish.map((f) => ({ species: f.sprite as string, x: f.x, y: f.y, calm: true, behavior: f.sprite === 'whale' || f.sprite === 'tidewarden_young' ? 'swim' : undefined })),
    ...state.props.filter((p) => p.kind === 'vent' && p.active).map((p) => ({ species: 'vent', x: p.x, y: p.y - 40, calm: true, behavior: 'breath' })),
    ...state.props.filter((p) => p.kind === 'guardian').map((p) => ({ species: 'guardian', x: p.x, y: p.y, calm: p.active })),
  ];
  let best: (typeof candidates)[number] | null = null;
  let bestD = range;
  for (const c of candidates) {
    const d = Math.hypot(c.x - diver.x, c.y - diver.y);
    if ((c.x - diver.x) * diver.facing < -30 || d > bestD) continue;
    best = c;
    bestD = d;
  }
  if (!best) return null;
  const quality = bestD < range * 0.4 ? 3 : bestD < range * 0.7 ? 2 : 1;
  const stars = Math.max(1, Math.min(3, quality - (best.calm ? 0 : 1) + (stats.camera >= 3 ? 1 : 0)));
  return { species: best.species, x: best.x, y: best.y, stars, behavior: best.behavior };
}

export const PHOTO_MODE_TIME = 10;

export function toggleCamera(state: GameState) {
  const { diver, stats } = state;
  if (state.photoMode > 0) {
    state.photoMode = 0;
    return;
  }
  if (state.phase !== 'dive' || diver.state !== 'diving' || stats.camera <= 0) return;
  state.photoMode = PHOTO_MODE_TIME;
  sfx(state, 'click', 0.5);
}

export function cameraKey(state: GameState) {
  if (state.photoMode > 0) takePhoto(state);
  else toggleCamera(state);
}

export function takePhoto(state: GameState) {
  const { diver, stats } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || stats.camera <= 0 || state.photoCooldown > 0) return;
  state.photoCooldown = 1.2;
  state.photoMode = PHOTO_MODE_TIME;
  const best = photoTarget(state);
  for (let i = 0; i < 10; i++) state.particles.push({ kind: 'splash', x: diver.x + diver.facing * 30, y: diver.y - 6, vx: diver.facing * (60 + Math.random() * 120), vy: (Math.random() - 0.5) * 120, life: 0.3, maxLife: 0.3, size: 6 });
  sfx(state, 'click', 1);
  if (!best) {
    floatText(state, 'Na fotce nic není', diver.x, diver.y - 50, '#A9C8EC');
    state.events.push({ type: 'photo', species: '', stars: 0, prev: 0 });
    return;
  }
  const { stars } = best;
  const existing = state.record.photos.find((p) => p.species === best.species);
  state.events.push({ type: 'photo', species: best.species, stars, prev: existing?.stars ?? 0 });
  if (existing) {
    existing.stars = Math.max(existing.stars, stars);
    if (best.behavior) existing.behavior = best.behavior;
  } else state.record.photos.push(best.behavior ? { species: best.species, stars, behavior: best.behavior } : { species: best.species, stars });
  if (best.behavior && best.behavior !== 'swim' && best.behavior !== 'breath') floatText(state, 'Zachycené chování!', best.x, best.y - 84, '#AD65F5');
  floatText(state, `Foto ${stars}/3`, best.x, best.y - 60, '#FFFFFF');
  haptic(state, 'light');
}

export function healDiver(state: GameState) {
  const { diver } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || diver.medkits <= 0 || diver.health >= MAX_HEALTH) return;
  diver.medkits -= 1;
  diver.health = Math.min(MAX_HEALTH, diver.health + MEDKIT_HEAL);
  floatText(state, `+${MEDKIT_HEAL} zdraví`, diver.x, diver.y - 50, '#65C83C');
  burst(state, 'spark', diver.x, diver.y, 10, 80, 0.6, 5);
  sfx(state, 'collect', 0.7);
  haptic(state, 'success');
}

export function fireScooter(state: GameState) {
  const { diver, stats } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || stats.scooter <= 0 || state.boostCooldown > 0) return;
  const spec = scooterFor(stats.scooter);
  state.boostTime = spec.time;
  state.boostCooldown = spec.cooldown;
  floatText(state, 'Skútr!', diver.x, diver.y - 50, '#FFBF32');
  sfx(state, 'bubbles', 0.9);
  haptic(state, 'light');
}


export function launchBalloon(state: GameState) {
  const { diver } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || diver.balloons <= 0 || diver.carried.length === 0) return;
  const heavy = diver.carried[diver.carried.length - 1].kind === 'heavy';
  if (heavy && diver.balloons < 2) {
    floatText(state, 'Těžká truhla potřebuje 2 balóny', diver.x, diver.y - 50, '#A9C8EC');
    return;
  }
  const chest = diver.carried.pop()!;
  diver.balloons -= heavy ? 2 : 1;
  if (heavy) state.record.heavy += 1;
  state.record.balloonsSent += 1;
  state.balloons.push({ id: ++state.entityId, chest, x: diver.x, y: diver.y - 20, vx: 0, vy: -30, surfaced: false, phase: Math.random() * 6 });
  floatText(state, 'Balón vyslán!', diver.x, diver.y - 50, '#FF9A3C');
  burst(state, 'bubble', diver.x, diver.y - 10, 10, 70, 1.2, 6);
  sfx(state, 'bubbles', 0.9);
  haptic(state, 'light');
}

export function fireRepellent(state: GameState) {
  const { diver } = state;
  if (state.phase !== 'dive' || diver.state !== 'diving' || diver.repellents <= 0 || state.repelTime > 0) return;
  diver.repellents -= 1;
  state.repelTime = 5;
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    state.particles.push({ kind: 'cloud', x: diver.x, y: diver.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 1.6, maxLife: 1.6, size: 26 });
  }
  floatText(state, 'Plašič!', diver.x, diver.y - 50, '#65C83C');
  sfx(state, 'zap', 0.8);
}

function updateBalloons(state: GameState, dt: number) {
  for (let i = state.balloons.length - 1; i >= 0; i--) {
    const b = state.balloons[i];
    b.phase += dt;
    if (!b.surfaced) {
      b.vy = Math.max(-150, b.vy - 70 * dt);
      b.y += b.vy * dt;
      b.x += Math.sin(b.phase * 1.3) * 10 * dt;
      const cave = caveAt(state, b.x);
      if (cave && b.y > cave.bottom && b.y + b.vy * dt < cave.bottom + 30) {
        b.y = cave.bottom + 30;
        b.vy = 0;
        b.x += (b.x < (cave.cave.x0 + cave.cave.x1) / 2 ? -1 : 1) * 60 * dt;
      }
      if (b.y <= 6) {
        b.y = 6;
        b.surfaced = true;
        b.vx = (Math.random() - 0.5) * 20;
        floatText(state, 'Truhla u hladiny', b.x, 0, '#FFBF32');
      }
      for (const shark of state.sharks) {
        const info = SHARKS[shark.kind];
        if (b.y < SURFACE_SAFE) break;
        if (shark.dying) continue;
        if (ellipseHit(b.x, b.y, shark.x + shark.facing * info.width * 0.3, shark.y, info.width * 0.3 + 14, info.width * 0.15 + 14)) {
          state.balloons.splice(i, 1);
          state.chests.push({
            id: b.chest.id,
            kind: b.chest.kind,
            x: b.x,
            y: b.y,
            restY: b.y,
            value: b.chest.value,
            regionId: b.chest.regionId,
            falling: true,
            vy: 10,
            phase: 0,
            pickupDelay: 0.5,
            boss: b.chest.boss,
            inCave: false,
            relic: b.chest.relic,
            rolled: true,
          });
          burst(state, 'spark', b.x, b.y - 30, 10, 120, 0.5, 5);
          floatText(state, 'Žralok prokousl balón!', b.x, b.y - 50, '#FF7185');
          sfx(state, 'mine', 0.5);
          break;
        }
      }
    } else {
      const drift = state.condition === 'storm' ? 26 : 8;
      b.vx += (Math.sin(b.phase * 0.4) * drift - b.vx) * Math.min(1, dt);
      b.x += b.vx * dt;
      b.y = 6 + Math.sin(b.phase * 2) * 2;
    }
  }
}

function discover(state: GameState, key: string, text: string, radio?: string) {
  if (state.record.discoveries.includes(key)) return;
  state.record.discoveries.push(key);
  state.events.push({ type: 'toast', text });
  if (radio) state.events.push({ type: 'radio', topic: radio });
}

function updateDiscoveries(state: GameState) {
  const { diver } = state;
  if (diver.state !== 'diving') return;
  state.record.minX = Math.min(state.record.minX, diver.x);
  state.record.maxX = Math.max(state.record.maxX, diver.x);
  const chunk = state.chunks.get(Math.floor(diver.x / CHUNK_W));
  if (!chunk) return;
  const cave = caveAt(state, diver.x);
  if (cave && diver.y > cave.bottom) discover(state, 'cave', 'Objevil jsi jeskyni! Hledej vzduchové kapsy.');
  if (chunk.decor.some((d) => d.sprite === 'wreck' && Math.abs(d.x - diver.x) < 220)) discover(state, 'wreck', 'Potopená loď! Pozor na padající trosky.');
  if (chunk.decor.some((d) => d.sprite === 'ruins' && Math.abs(d.x - diver.x) < 200)) discover(state, 'ruins', 'Starověké ruiny!');
  const ocean = oceanOf(state);
  if (chunk.boss) discover(state, `boss:${ocean.id}`, `Doupě: ${SHARKS[ocean.boss].name}! Ukradni jeho poklad.`, 'boss');
  const depth = Math.round(diver.y / PX_PER_M);
  if (depth >= 100) discover(state, 'abyss', 'Hloubka 100 m – vítej v hlubině.');
  discover(state, `loc:${ocean.id}:${chunk.regionId}`, `Nová lokace: ${ocean.regions[chunk.regionId].name}`, 'new_location');
}

export function updateExtras(state: GameState, dt: number) {
  state.inkTime = Math.max(0, state.inkTime - dt);
  state.repelTime = Math.max(0, state.repelTime - dt);
  state.boostTime = Math.max(0, state.boostTime - dt);
  state.photoCooldown = Math.max(0, state.photoCooldown - dt);
  const shooting = state.phase === 'dive' && state.diver.state === 'diving' && state.stats.camera > 0;
  state.photoMode = shooting ? Math.max(0, state.photoMode - dt) : 0;
  state.photoAim = state.photoMode > 0 ? photoTarget(state) : null;
  state.boostCooldown = Math.max(0, state.boostCooldown - dt);
  if (state.boostTime > 0 && state.diver.state === 'diving') {
    const { diver } = state;
    state.particles.push({ kind: 'bubble', x: diver.x - diver.facing * 26, y: diver.y + (Math.random() - 0.5) * 10, vx: -diver.facing * 60, vy: -20, life: 0.6, maxLife: 0.6, size: 4 + Math.random() * 4 });
  }
  updateBalloons(state, dt);
  updateHarpoons(state, dt);
  updateDiscoveries(state);
}
