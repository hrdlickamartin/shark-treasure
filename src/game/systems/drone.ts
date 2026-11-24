import { SHARKS } from '../catalog';
import { MATERIALS, type MaterialId } from '../gear';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import type { Drone, GameState } from '../types';
import { burst, floatText, haptic, sfx } from './effects';

export const DRONE_SPEED = 300;
export const SCOUT_RADIUS = 170;
export const SCOUT_TIME = 3;
export const DRONE_COOLDOWN = [12, 12, 10, 8];
export const DRONE_CARRY_LIMIT = 100;
const OFF_TIME = 2;

const SCAN_HAZARDS = new Set(['jelly', 'octopus', 'eel', 'crab', 'urchin', 'ray', 'angler', 'barracuda', 'siphon', 'pistol', 'mimic']);

function mood(drone: Drone, icon: string) {
  drone.mood = icon;
  drone.moodTime = 1.4;
}

export function droneReady(state: GameState): boolean {
  const { drone, stats, diver } = state;
  return stats.drone > 0 && state.phase === 'dive' && diver.state === 'diving' && drone.mode === 'dock' && drone.cooldown <= 0;
}

export function firePip(state: GameState) {
  const { drone, diver, stats } = state;
  if (!droneReady(state)) return;
  drone.mode = 'out';
  drone.timer = 1.6;
  const range = stats.droneRange;
  drone.targetX = diver.x + diver.facing * range;
  drone.targetY = clamp(diver.y + diver.vy * 0.3, 40, floorAt(state, diver.x + diver.facing * range) - 40);
  drone.facing = diver.facing;
  mood(drone, '!');
  sfx(state, 'pip', 0.8);
  haptic(state, 'light');
}

export function recallPip(state: GameState) {
  const { drone } = state;
  if (drone.mode === 'out' || drone.mode === 'scout') {
    drone.mode = 'return';
    sfx(state, 'pip', 0.5);
  }
}

export function pipKey(state: GameState) {
  if (state.drone.mode === 'dock') firePip(state);
  else recallPip(state);
}

function moveToward(drone: Drone, x: number, y: number, speed: number, dt: number): number {
  const dx = x - drone.x;
  const dy = y - drone.y;
  const d = Math.hypot(dx, dy);
  const step = Math.min(d, speed * dt);
  if (d > 0.01) {
    drone.vx = (dx / d) * speed;
    drone.vy = (dy / d) * speed;
    drone.x += (dx / d) * step;
    drone.y += (dy / d) * step;
    if (Math.abs(dx) > 4) drone.facing = dx > 0 ? 1 : -1;
  }
  return d;
}

function scout(state: GameState) {
  const { drone, stats } = state;
  const inRange = (x: number, y: number) => Math.hypot(x - drone.x, y - drone.y) < SCOUT_RADIUS;
  let found = false;
  for (const chest of state.chests) {
    if (!inRange(chest.x, chest.y) || state.revealed.includes(chest.id)) continue;
    state.revealed.push(chest.id);
    if (!state.seenChests.includes(chest.id)) state.seenChests.push(chest.id);
    found = true;
  }
  for (const h of state.hazards) {
    if (h.alive && h.kind === 'mimic' && h.state === 0 && inRange(h.x, h.y)) {
      h.state = 1;
      floatText(state, 'Pip: to není truhla!', h.x, h.y - 40, '#C8B6FF');
      found = true;
    }
  }
  for (const p of state.props) {
    if (p.kind === 'dig' && !p.active && inRange(p.x, p.y)) {
      p.active = true;
      floatText(state, 'Pip něco vyhrabal!', p.x, p.y - 40, '#FFBF32');
      found = true;
    }
    if (p.kind === 'scan' && !p.active && inRange(p.x, p.y)) {
      p.active = true;
      state.record.activated.push(p.id);
      floatText(state, 'Naskenováno', p.x, p.y - 40, '#20D4E8');
      found = true;
    }
  }
  if (stats.drone >= 2 && !drone.carry) {
    const material = state.props.find((p) => p.kind === 'material' && !p.taken && inRange(p.x, p.y));
    const shard = stats.pipMagnet ? state.props.find((p) => p.kind === 'shard' && !p.taken && inRange(p.x, p.y)) : undefined;
    if (shard) {
      shard.taken = true;
      drone.carry = { kind: 'shard', value: 1, id: shard.id };
    } else if (material) {
      material.taken = true;
      drone.carry = { kind: 'material', value: material.value, material: material.tag };
    } else {
      let value = 0;
      state.coins = state.coins.filter((c) => {
        if (value + c.value > DRONE_CARRY_LIMIT || !inRange(c.x, c.y)) return true;
        value += c.value;
        return false;
      });
      if (value > 0) drone.carry = { kind: 'coins', value };
    }
    if (drone.carry) {
      mood(drone, '♥');
      found = true;
    }
  }
  if (stats.drone >= 3 || stats.lens) {
    const stars = stats.lens ? 2 : 1;
    const candidates = [
      ...state.sharks.filter((s) => !s.dying && !SHARKS[s.kind].boss).map((s) => ({ species: s.kind as string, x: s.x, y: s.y })),
      ...state.hazards.filter((h) => h.alive && SCAN_HAZARDS.has(h.kind) && (h.kind !== 'mimic' || h.state > 0)).map((h) => ({ species: h.kind as string, x: h.x, y: h.y })),
      ...state.fish.map((f) => ({ species: f.sprite as string, x: f.x, y: f.y })),
    ].filter((c) => inRange(c.x, c.y) && !state.record.scans.includes(c.species));
    const target = candidates[0];
    if (target) {
      state.record.scans.push(target.species);
      const existing = state.record.photos.find((p) => p.species === target.species);
      if (existing) existing.stars = Math.max(existing.stars, stars);
      else state.record.photos.push({ species: target.species, stars });
      floatText(state, `Pip naskenoval tvora (${stars}★)`, target.x, target.y - 50, '#20D4E8');
      found = true;
    }
  }
  if (!found) mood(drone, '?');
}

function deliver(state: GameState) {
  const { drone, diver, record } = state;
  const carry = drone.carry;
  drone.carry = null;
  if (!carry) return;
  if (carry.kind === 'coins') {
    diver.coins += carry.value;
    floatText(state, `Pip: +${carry.value}`, diver.x, diver.y - 50, '#FFBF32');
  } else if (carry.kind === 'material' && carry.material) {
    const id = carry.material as MaterialId;
    record.materials = { ...record.materials, [id]: (record.materials[id] ?? 0) + carry.value };
    floatText(state, `Pip: +${carry.value} ${MATERIALS[id].name}`, diver.x, diver.y - 50, '#FFBF32');
  } else if (carry.kind === 'shard' && carry.id) {
    diver.cargo.push(carry.id);
    floatText(state, 'Pip donesl atlantský úlomek!', diver.x, diver.y - 50, '#20D4E8');
  }
  burst(state, 'spark', diver.x, diver.y - 20, 8, 80, 0.5, 4);
  sfx(state, 'collect', 0.6);
}

function threatened(state: GameState, drone: Drone): boolean {
  return state.sharks.some((s) => !s.dying && Math.hypot(s.x - drone.x, s.y - drone.y) < SHARKS[s.kind].width * 0.35 + 20);
}

export function updateDrone(state: GameState, dt: number) {
  const { drone, diver, stats } = state;
  drone.phase += dt;
  drone.moodTime = Math.max(0, drone.moodTime - dt);
  if (stats.drone <= 0 || state.phase !== 'dive' || diver.state !== 'diving') {
    drone.mode = 'dock';
    drone.carry = null;
    drone.x = diver.x - diver.facing * 34;
    drone.y = diver.y - 34;
    return;
  }
  const dockX = diver.x - diver.facing * 38;
  const dockY = diver.y - 36 + Math.sin(drone.phase * 3) * 4;
  if (drone.mode !== 'dock' && drone.mode !== 'off' && threatened(state, drone)) {
    drone.mode = 'off';
    drone.timer = OFF_TIME;
    drone.vy = 20;
    mood(drone, '!');
    burst(state, 'spark', drone.x, drone.y, 8, 90, 0.4, 4);
    sfx(state, 'zap', 0.4);
  }
  switch (drone.mode) {
    case 'dock': {
      drone.cooldown = Math.max(0, drone.cooldown - dt);
      const k = Math.min(1, dt * 6);
      drone.x += (dockX - drone.x) * k;
      drone.y += (dockY - drone.y) * k;
      drone.facing = diver.facing;
      break;
    }
    case 'out': {
      drone.timer -= dt;
      const d = moveToward(drone, drone.targetX, drone.targetY, DRONE_SPEED, dt);
      if (d < 8 || drone.timer <= 0) {
        drone.mode = 'scout';
        drone.timer = SCOUT_TIME;
        scout(state);
      }
      break;
    }
    case 'scout': {
      drone.timer -= dt;
      drone.y += Math.sin(drone.phase * 4) * 10 * dt;
      if (Math.floor((drone.timer + dt) * 2) !== Math.floor(drone.timer * 2)) scout(state);
      if (drone.timer <= 0) drone.mode = 'return';
      break;
    }
    case 'return': {
      const d = moveToward(drone, dockX, dockY, DRONE_SPEED * 1.2, dt);
      if (d < 26) {
        deliver(state);
        drone.mode = 'dock';
        drone.cooldown = DRONE_COOLDOWN[Math.min(DRONE_COOLDOWN.length - 1, stats.drone)];
      }
      break;
    }
    case 'off': {
      drone.timer -= dt;
      drone.vy = Math.min(40, drone.vy + 30 * dt);
      drone.y = Math.min(drone.y + drone.vy * dt, floorAt(state, drone.x) - 20);
      if (drone.timer <= 0) drone.mode = 'return';
      break;
    }
  }
}
