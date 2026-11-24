import { HAZARD_DAMAGE, SHARKS } from '../catalog';
import { ACTIVE_RANGE, SURFACE_SAFE } from '../constants';
import { clampToShaft } from '../endless';
import { CHALLENGES } from '../modifiers';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import type { GameState, Hazard, Shark } from '../types';
import { caveAt } from '../world';
import { damageDiver, ellipseHit } from './collision';
import { updateAngler, updateRay, updateSpikes, updateToxic } from './creatures';
import { burst, floatText, sfx, shake } from './effects';

const ACTIVE_DEPTH = 1800;

const REPEL_RADIUS = 420;
const MEGA_LEASH = 720;

function diverHuntable(state: GameState): boolean {
  const { diver } = state;
  return diver.state === 'diving' && diver.y > SURFACE_SAFE && !diver.inAir;
}

function steer(shark: Shark, tvx: number, tvy: number, rate: number, dt: number) {
  const k = Math.min(1, dt * rate);
  shark.vx += (tvx - shark.vx) * k;
  shark.vy += (tvy - shark.vy) * k;
}

function repelled(state: GameState, shark: Shark): boolean {
  return state.repelTime > 0 && Math.hypot(state.diver.x - shark.x, state.diver.y - shark.y) < REPEL_RADIUS && !SHARKS[shark.kind].boss;
}

function alertShark(state: GameState, shark: Shark) {
  shark.alert = 0.8;
  if (state.sharkSoundTimer <= 0) {
    sfx(state, 'shark', 0.8);
    state.events.push({ type: 'radio', topic: 'danger' });
    state.sharkSoundTimer = 3;
  }
}

function updateMega(state: GameState, shark: Shark, dt: number) {
  const info = SHARKS.mega;
  const { diver } = state;
  const dx = diver.x - shark.x;
  const dy = diver.y - shark.y;
  const dist = Math.hypot(dx, dy);
  const homeDist = Math.abs(diver.x - shark.homeX);
  shark.alert = Math.max(0, shark.alert - dt);
  shark.phase += dt * (shark.mode === 'charge' ? 16 : shark.mode === 'telegraph' ? 3 : 6);
  switch (shark.mode) {
    case 'telegraph': {
      shark.timer -= dt;
      steer(shark, 0, 0, 4, dt);
      if (Math.random() < dt * 20) burst(state, 'bubble', shark.x + shark.facing * 120, shark.y, 1, 30, 0.8, 6);
      if (shark.timer <= 0) {
        shark.mode = 'charge';
        shark.timer = 0.95;
        const len = Math.hypot(shark.targetX - shark.x, shark.targetY - shark.y) || 1;
        shark.vx = ((shark.targetX - shark.x) / len) * 560;
        shark.vy = ((shark.targetY - shark.y) / len) * 560;
        sfx(state, 'shark', 1);
        shake(state, 8);
      }
      break;
    }
    case 'charge': {
      shark.timer -= dt;
      if (shark.timer <= 0) {
        shark.mode = 'tired';
        shark.timer = 1.7;
        shark.vx *= 0.2;
        shark.vy *= 0.2;
      }
      break;
    }
    case 'tired': {
      shark.timer -= dt;
      steer(shark, 0, 20, 1.5, dt);
      if (shark.timer <= 0) shark.mode = 'patrol';
      break;
    }
    default: {
      const back = shark.x > shark.homeX + shark.range ? -1 : shark.x < shark.homeX - shark.range ? 1 : shark.facing;
      shark.facing = back;
      const huntingRange = homeDist < MEGA_LEASH && diverHuntable(state);
      if (huntingRange && dist < info.vision) {
        steer(shark, (dx / (dist || 1)) * info.chase, (dy / (dist || 1)) * info.chase, 1.6, dt);
        if (dist < 340) {
          shark.mode = 'telegraph';
          shark.timer = 0.9;
          shark.targetX = diver.x + diver.vx * 0.4;
          shark.targetY = diver.y + diver.vy * 0.4;
          alertShark(state, shark);
        }
      } else {
        steer(shark, shark.facing * info.patrol, (shark.homeY - shark.y) * 0.5, 1.5, dt);
      }
    }
  }
}

function sinkShark(state: GameState, shark: Shark, dt: number): boolean {
  shark.dying -= dt;
  shark.vy = Math.min(90, shark.vy + 70 * dt);
  shark.vx *= Math.exp(-2 * dt);
  shark.x += shark.vx * dt;
  shark.y = Math.min(shark.y + shark.vy * dt, floorAt(state, shark.x) - 20);
  shark.phase += dt * 1.5;
  if (Math.random() < dt * 14) burst(state, 'bubble', shark.x, shark.y - 10, 1, 40, 1, 5);
  if (shark.dying > 0) return false;
  shark.dying = -1;
  burst(state, 'bubble', shark.x, shark.y, 12, 90, 1.2, 7);
  return true;
}

function updateShark(state: GameState, shark: Shark, dt: number) {
  const info = SHARKS[shark.kind];
  const { diver } = state;
  const dx = diver.x - shark.x;
  const dy = diver.y - shark.y;
  const dist = Math.hypot(dx, dy);
  const frenzy = !!state.challenge && CHALLENGES[state.challenge].frenzy;
  const speedUp = (frenzy ? 1.2 : 1) * state.stats.sharkSpeed;
  shark.lungeCooldown = Math.max(0, shark.lungeCooldown - dt);

  if (info.boss) {
    updateMega(state, shark, dt);
  } else {
    shark.alert = Math.max(0, shark.alert - dt);
    shark.phase += dt * (shark.mode === 'chase' || shark.mode === 'lunge' ? 13 : 6);
    if (repelled(state, shark) && shark.mode !== 'retreat') {
      shark.mode = 'retreat';
      shark.timer = state.repelTime;
    }
    switch (shark.mode) {
      case 'patrol': {
        if (shark.x > shark.homeX + shark.range) shark.facing = -1;
        if (shark.x < shark.homeX - shark.range) shark.facing = 1;
        const tvy = Math.sin(shark.phase * 0.15) * 12 + (shark.homeY - shark.y) * 0.6;
        steer(shark, shark.facing * info.patrol, tvy, 2, dt);
        const inFront = Math.sign(dx) === shark.facing || dist < info.vision * 0.45;
        const vision = info.vision * (diver.carried.length > 0 ? 1.1 : 1) * (state.condition === 'night' ? 0.8 : 1);
        if ((shark.hunter || frenzy) && diverHuntable(state) && dist < vision && inFront && !repelled(state, shark)) {
          shark.mode = 'chase';
          shark.timer = info.chaseTime;
          alertShark(state, shark);
        }
        break;
      }
      case 'chase': {
        shark.timer -= dt;
        const len = dist || 1;
        steer(shark, (dx / len) * info.chase * speedUp, (dy / len) * info.chase * speedUp, 2.4, dt);
        if (dist < 120 && shark.lungeCooldown <= 0 && diverHuntable(state)) {
          shark.mode = 'lunge';
          shark.timer = 0.38;
          shark.vx = (dx / len) * info.chase * 2.3 * speedUp;
          shark.vy = (dy / len) * info.chase * 2.3 * speedUp;
        } else if (shark.timer <= 0 || !diverHuntable(state)) {
          shark.mode = 'retreat';
          shark.timer = 2.2;
        }
        break;
      }
      case 'lunge': {
        shark.timer -= dt;
        if (shark.timer <= 0) {
          shark.mode = 'retreat';
          shark.timer = 1.4;
          shark.lungeCooldown = 1.6;
          shark.vx *= 0.25;
          shark.vy *= 0.25;
        }
        break;
      }
      default: {
        shark.timer -= dt;
        const away = dx === 0 ? shark.facing * -1 : -Math.sign(dx);
        const flee = repelled(state, shark) ? 2.2 : 0.8;
        steer(shark, away * info.patrol * flee, (shark.homeY - shark.y) * 0.5, 1.2, dt);
        if (shark.timer <= 0) {
          shark.mode = 'patrol';
          shark.homeX = clamp(shark.x, shark.homeX - 400, shark.homeX + 400);
        }
      }
    }
  }

  shark.x += shark.vx * dt;
  shark.y += shark.vy * dt;
  const floor = floorAt(state, shark.x) - info.width * 0.22;
  shark.y = clamp(shark.y, SURFACE_SAFE - 10, floor);
  if (state.mode === 'endless') shark.x = clampToShaft(state, shark.x, shark.y, info.width * 0.45);
  const cave = caveAt(state, shark.x);
  if (cave && shark.y > cave.top - info.width * 0.2 && shark.y < cave.bottom + info.width * 0.15) {
    shark.y = shark.y > (cave.top + cave.bottom) / 2 ? cave.bottom + info.width * 0.15 : cave.top - info.width * 0.2;
    shark.vy = 0;
  }
  if (Math.abs(shark.vx) > 6 && shark.mode !== 'telegraph') shark.facing = shark.vx > 0 ? 1 : -1;
  if (shark.mode === 'telegraph') shark.facing = shark.targetX > shark.x ? 1 : -1;

  const mouthX = shark.x + shark.facing * info.width * 0.3;
  if (
    diverHuntable(state) &&
    (ellipseHit(diver.x, diver.y, mouthX, shark.y, info.width * 0.28 + 16, info.width * 0.14 + 16) ||
      ellipseHit(diver.x, diver.y, shark.x, shark.y, info.width * 0.42, info.width * 0.12 + 10))
  ) {
    if (damageDiver(state, info.damage, info.boss ? 'mega' : 'shark', shark.x, shark.y, true)) {
      if (info.boss) {
        shark.mode = 'tired';
        shark.timer = 2;
      } else {
        shark.mode = 'retreat';
        shark.timer = 2.6;
        shark.vx *= -0.4;
        shark.lungeCooldown = 2.5;
      }
    }
  }
}

function updateOctopus(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  h.cooldown = Math.max(0, h.cooldown - dt);
  h.vx *= Math.exp(-1.6 * dt);
  h.vy *= Math.exp(-1.6 * dt);
  h.x += (h.vx + Math.sin(h.phase * 0.4) * 14) * dt;
  h.y += (h.vy + Math.cos(h.phase * 0.7) * 10) * dt;
  h.y = clamp(h.y, SURFACE_SAFE + 30, floorAt(state, h.x) - 40);
  const d = Math.hypot(diver.x - h.x, diver.y - h.y);
  const away = diver.x > h.x ? -1 : 1;
  if (diver.state === 'diving' && d < 170 && h.cooldown > 0) h.vx += away * 60 * dt;
  if (diver.state === 'diving' && d < 90 && h.cooldown <= 0) {
    h.cooldown = 6;
    state.inkTime = 1.4;
    h.vx = away * 260;
    h.vy = -60;
    for (let i = 0; i < 10; i++) {
      state.particles.push({ kind: 'ink', x: h.x, y: h.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 1.6, maxLife: 1.6, size: 16 + Math.random() * 18 });
    }
    floatText(state, 'Chobotnice se brání!', h.x, h.y - 40, '#C8B6FF');
    sfx(state, 'drop', 0.6);
  }
}

function updateEel(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  h.cooldown = Math.max(0, h.cooldown - dt);
  if (h.state === 0) {
    h.timer = Math.max(0, h.timer - dt * 3);
    const ahead = (diver.x - h.x) * h.dir;
    if (diver.state === 'diving' && h.cooldown <= 0 && ahead > 0 && ahead < 130 && Math.abs(diver.y - h.y) < 45) {
      h.state = 1;
      sfx(state, 'shark', 0.5);
    }
  } else if (h.state === 1) {
    h.timer = Math.min(1, h.timer + dt * 5);
    if (h.timer >= 1) {
      h.state = 2;
      h.vx = 0.45;
    }
  } else {
    h.vx -= dt;
    if (h.vx <= 0) {
      h.state = 0;
      h.cooldown = 2.2;
    }
  }
  const headX = h.x + h.dir * h.timer * 80;
  if (h.timer > 0.4 && diver.state === 'diving' && ellipseHit(diver.x, diver.y, headX, h.y, 28, 24)) {
    if (damageDiver(state, HAZARD_DAMAGE.eel, 'eel', headX, h.y, false)) {
      h.state = 2;
      h.vx = 0.2;
    }
  }
}

function updateDebris(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  if (h.state === 0) {
    h.timer -= dt;
    const under = Math.abs(diver.x - h.x) < 110 && diver.y > h.y;
    if (h.timer <= 0 && under && diver.state === 'diving') {
      h.state = 1;
      h.timer = 0.8;
      floatText(state, '!', h.x, h.y - 20, '#FF7185');
    }
  } else if (h.state === 1) {
    h.timer -= dt;
    h.x += Math.sin(h.phase * 40) * 0.6;
    if (h.timer <= 0) {
      h.state = 2;
      h.vy = 40;
      sfx(state, 'drop', 0.6);
    }
  } else if (h.state === 2) {
    h.vy = Math.min(320, h.vy + 420 * dt);
    h.y += h.vy * dt;
    if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, h.x, h.y, 34, 26)) {
      damageDiver(state, HAZARD_DAMAGE.debris, 'debris', h.x, h.y - 30, true);
    }
    const floor = floorAt(state, h.x) - 10;
    if (h.y >= floor) {
      h.y = floor;
      h.state = 3;
      h.timer = 3.5;
      burst(state, 'bubble', h.x, h.y, 8, 60, 1.2, 6);
    }
  } else {
    h.timer -= dt;
    if (h.timer <= 0) {
      h.state = 0;
      h.y = h.anchorY;
      h.timer = 2.5;
    }
  }
}

function updateCrab(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  if (h.state === 1) {
    h.x += h.dir * 90 * dt;
    h.y = floorAt(state, h.x) - 16;
    h.timer -= dt;
    if (h.timer <= 0) h.alive = false;
    return;
  }
  h.timer -= dt;
  if (h.timer <= 0) {
    h.dir = h.dir === 1 ? -1 : 1;
    h.timer = 1.8 + Math.random() * 1.5;
  }
  if (diver.state !== 'diving' || Math.hypot(diver.x - h.x, diver.y - h.y) > 52) return;
  const side = diver.x > h.x ? 1 : -1;
  if (side === h.dir) {
    if (damageDiver(state, HAZARD_DAMAGE.crab, 'crab', h.x, h.y + 10, false)) floatText(state, 'Štíp!', h.x, h.y - 30, '#FF7185');
  } else {
    h.state = 1;
    h.dir = side === 1 ? -1 : 1;
    h.timer = 1.6;
    floatText(state, 'Krab utekl!', h.x, h.y - 30, '#FFFFFF');
    sfx(state, 'click', 0.8);
  }
}

export function updateEnemies(state: GameState, dt: number) {
  const { diver } = state;
  state.sharkSoundTimer = Math.max(0, state.sharkSoundTimer - dt);
  const focusX = diver.state === 'boat' ? state.boat.x : diver.x;
  const focusY = state.camera.y;
  let gone = false;
  for (const shark of state.sharks) {
    shark.hitFlash = Math.max(0, shark.hitFlash - dt);
    if (shark.dying > 0) {
      gone = sinkShark(state, shark, dt) || gone;
      continue;
    }
    if (Math.abs(shark.x - focusX) > ACTIVE_RANGE || Math.abs(shark.y - focusY) > ACTIVE_DEPTH) continue;
    updateShark(state, shark, dt);
  }
  if (gone) state.sharks = state.sharks.filter((s) => s.dying >= 0);

  for (const hazard of state.hazards) {
    if (!hazard.alive || Math.abs(hazard.x - focusX) > ACTIVE_RANGE || Math.abs(hazard.y - focusY) > ACTIVE_DEPTH) continue;
    hazard.phase += dt;
    switch (hazard.kind) {
      case 'jelly': {
        hazard.y = hazard.baseY + Math.sin(hazard.phase * 0.9) * 28;
        hazard.x += Math.sin(hazard.phase * 0.3) * 6 * dt;
        if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, hazard.x, hazard.y + 8, 34, 42)) {
          if (damageDiver(state, HAZARD_DAMAGE.jelly, 'jelly', hazard.x, hazard.y, false)) {
            diver.stun = 1.2;
            sfx(state, 'zap');
            burst(state, 'spark', diver.x, diver.y, 10, 90, 0.4, 4);
          }
        }
        break;
      }
      case 'mine': {
        hazard.y = hazard.baseY + Math.sin(hazard.phase * 1.2) * 5;
        if (diver.state === 'diving' && Math.hypot(diver.x - hazard.x, diver.y - hazard.y) < 46) {
          hazard.alive = false;
          sfx(state, 'mine');
          burst(state, 'boom', hazard.x, hazard.y, 18, 220, 0.7, 14);
          burst(state, 'bubble', hazard.x, hazard.y, 14, 120, 1.6, 8);
          shake(state, 20);
          diver.invuln = 0;
          damageDiver(state, HAZARD_DAMAGE.mine, 'mine', hazard.x, hazard.y, true);
        }
        break;
      }
      case 'urchin': {
        if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, hazard.x, hazard.y, 30, 26)) {
          damageDiver(state, HAZARD_DAMAGE.urchin, 'urchin', hazard.x, hazard.y + 20, false);
        }
        break;
      }
      case 'octopus':
        updateOctopus(state, hazard, dt);
        break;
      case 'eel':
        updateEel(state, hazard, dt);
        break;
      case 'debris':
        updateDebris(state, hazard, dt);
        break;
      case 'crab':
        updateCrab(state, hazard, dt);
        break;
      case 'angler':
        updateAngler(state, hazard, dt);
        break;
      case 'ray':
        updateRay(state, hazard, dt);
        break;
      case 'toxic':
        updateToxic(state, hazard, dt);
        break;
      case 'spikes':
        updateSpikes(state, hazard);
        break;
    }
  }
}
