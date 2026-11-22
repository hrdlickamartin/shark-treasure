import { HAZARD_DAMAGE, SHARKS } from '../catalog';
import { ACTIVE_RANGE, SURFACE_SAFE } from '../constants';
import { clamp } from '../rng';
import { seabedY } from '../terrain';
import type { GameState, Shark } from '../types';
import { damageDiver, ellipseHit } from './collision';
import { burst, sfx, shake } from './effects';

function diverHuntable(state: GameState): boolean {
  const { diver } = state;
  return diver.state === 'diving' && diver.y > SURFACE_SAFE;
}

function steer(shark: Shark, tvx: number, tvy: number, rate: number, dt: number) {
  const k = Math.min(1, dt * rate);
  shark.vx += (tvx - shark.vx) * k;
  shark.vy += (tvy - shark.vy) * k;
}

function updateShark(state: GameState, shark: Shark, dt: number) {
  const info = SHARKS[shark.kind];
  const { diver } = state;
  const dx = diver.x - shark.x;
  const dy = diver.y - shark.y;
  const dist = Math.hypot(dx, dy);
  shark.lungeCooldown = Math.max(0, shark.lungeCooldown - dt);
  shark.alert = Math.max(0, shark.alert - dt);
  shark.phase += dt * (shark.mode === 'chase' || shark.mode === 'lunge' ? 13 : 6);

  switch (shark.mode) {
    case 'patrol': {
      if (shark.x > shark.homeX + shark.range) shark.facing = -1;
      if (shark.x < shark.homeX - shark.range) shark.facing = 1;
      const tvy = Math.sin(shark.phase * 0.15) * 12 + (shark.homeY - shark.y) * 0.6;
      steer(shark, shark.facing * info.patrol, tvy, 2, dt);
      const inFront = Math.sign(dx) === shark.facing || dist < info.vision * 0.45;
      const vision = info.vision * (state.diver.carried.length > 0 ? 1.1 : 1);
      if (shark.hunter && diverHuntable(state) && dist < vision && inFront) {
        shark.mode = 'chase';
        shark.timer = info.chaseTime;
        shark.alert = 0.8;
        if (state.sharkSoundTimer <= 0) {
          sfx(state, 'shark', 0.8);
          state.sharkSoundTimer = 3;
        }
      }
      break;
    }
    case 'chase': {
      shark.timer -= dt;
      const len = dist || 1;
      steer(shark, (dx / len) * info.chase, (dy / len) * info.chase, 2.4, dt);
      if (dist < 120 && shark.lungeCooldown <= 0 && diverHuntable(state)) {
        shark.mode = 'lunge';
        shark.timer = 0.38;
        shark.vx = (dx / len) * info.chase * 2.3;
        shark.vy = (dy / len) * info.chase * 2.3;
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
    case 'retreat': {
      shark.timer -= dt;
      const away = dx === 0 ? shark.facing * -1 : -Math.sign(dx);
      steer(shark, away * info.patrol * 0.8, (shark.homeY - shark.y) * 0.5, 1.2, dt);
      if (shark.timer <= 0) {
        shark.mode = 'patrol';
        shark.homeX = clamp(shark.x, shark.homeX - 400, shark.homeX + 400);
      }
      break;
    }
  }

  shark.x += shark.vx * dt;
  shark.y += shark.vy * dt;
  const floor = seabedY(state.seed, shark.x) - info.width * 0.22;
  shark.y = clamp(shark.y, SURFACE_SAFE - 10, floor);
  if (Math.abs(shark.vx) > 6) shark.facing = shark.vx > 0 ? 1 : -1;

  const mouthX = shark.x + shark.facing * info.width * 0.3;
  if (
    diverHuntable(state) &&
    (ellipseHit(diver.x, diver.y, mouthX, shark.y, info.width * 0.28 + 16, info.width * 0.14 + 16) ||
      ellipseHit(diver.x, diver.y, shark.x, shark.y, info.width * 0.42, info.width * 0.12 + 10))
  ) {
    if (damageDiver(state, info.damage, 'shark', shark.x, shark.y, true)) {
      shark.mode = 'retreat';
      shark.timer = 2.6;
      shark.vx *= -0.4;
      shark.lungeCooldown = 2.5;
    }
  }
}

export function updateEnemies(state: GameState, dt: number) {
  const { diver } = state;
  state.sharkSoundTimer = Math.max(0, state.sharkSoundTimer - dt);
  const focusX = diver.state === 'boat' ? state.boat.x : diver.x;
  for (const shark of state.sharks) {
    if (Math.abs(shark.x - focusX) > ACTIVE_RANGE) continue;
    updateShark(state, shark, dt);
  }

  for (const hazard of state.hazards) {
    if (!hazard.alive || Math.abs(hazard.x - focusX) > ACTIVE_RANGE) continue;
    hazard.phase += dt;
    if (hazard.kind === 'jelly') {
      hazard.y = hazard.baseY + Math.sin(hazard.phase * 0.9) * 28;
      hazard.x += Math.sin(hazard.phase * 0.3) * 6 * dt;
      if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, hazard.x, hazard.y + 8, 34, 42)) {
        if (damageDiver(state, HAZARD_DAMAGE.jelly, 'jelly', hazard.x, hazard.y, false)) {
          diver.stun = 1.2;
          sfx(state, 'zap');
          burst(state, 'spark', diver.x, diver.y, 10, 90, 0.4, 4);
        }
      }
    } else if (hazard.kind === 'mine') {
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
    } else if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, hazard.x, hazard.y, 30, 26)) {
      damageDiver(state, HAZARD_DAMAGE.urchin, 'urchin', hazard.x, hazard.y + 20, false);
    }
  }
}
