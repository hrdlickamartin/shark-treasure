import { DIVER_ACCEL, DIVER_MIN_Y, DIVER_RADIUS } from '../constants';
import { clamp } from '../rng';
import { seabedY } from '../terrain';
import type { GameState, Input } from '../types';
import { bubble, sfx } from './effects';

export function carriedWeight(state: GameState): number {
  return state.diver.carried.reduce((sum, c) => sum + c.weight, 0);
}

export function updateBoat(state: GameState, input: Input, dt: number) {
  const { boat, stats } = state;
  const backwards = input.x !== 0 && Math.sign(input.x) !== boat.facing;
  if (backwards && Math.abs(input.x) > 0.3 && boat.turnFx <= 0) {
    boat.reverse += dt;
    if (boat.reverse > 0.3) {
      boat.facing = boat.facing === 1 ? -1 : 1;
      boat.reverse = 0;
      boat.turnFx = 1;
      boat.vx *= 0.3;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 14; i++) {
          state.particles.push({
            kind: 'splash',
            x: boat.x + side * (30 + Math.random() * 70),
            y: 6,
            vx: side * (30 + Math.random() * 120),
            vy: -160 - Math.random() * 200,
            life: 0.8,
            maxLife: 0.8,
            size: 8 + Math.random() * 8,
          });
        }
      }
      sfx(state, 'splash', 0.45);
    }
  } else boat.reverse = 0;
  const reversing = backwards && boat.turnFx <= 0;
  const target = input.x * stats.boatSpeed * (reversing ? 0.35 : boat.turnFx > 0 ? 0.2 : 1);
  boat.vx += (target - boat.vx) * Math.min(1, dt * 2.5);
  let next = boat.x + boat.vx * dt;
  const limit = stats.boatLimit - 140;
  if (Math.abs(next) > limit) {
    next = Math.sign(next) * limit;
    boat.vx = 0;
    if (boat.lockedNotice <= 0 && Math.abs(input.x) > 0.2) {
      state.events.push({ type: 'locked' });
      boat.lockedNotice = 2.5;
    }
  }
  boat.lockedNotice = Math.max(0, boat.lockedNotice - dt);
  boat.x = next;
}

export function updateDiverMovement(state: GameState, input: Input, dt: number) {
  const { diver, stats } = state;
  const weight = carriedWeight(state);
  let max = stats.speed * Math.max(0.55, 1 - weight * 0.09);
  if (diver.hurt > 0) max *= 0.7;
  if (diver.stun > 0) max *= 0.5;

  const mag = Math.hypot(input.x, input.y);
  const ix = mag > 1 ? input.x / mag : input.x;
  const iy = mag > 1 ? input.y / mag : input.y;
  const upBoost = iy < 0 ? stats.ascent : 1;

  diver.vx += ix * DIVER_ACCEL * dt;
  diver.vy += iy * DIVER_ACCEL * upBoost * dt;
  if (Math.abs(ix) < 0.1) diver.vx *= Math.exp(-4 * dt);
  if (Math.abs(iy) < 0.1) diver.vy *= Math.exp(-4 * dt);

  const vmaxY = iy < 0 ? max * upBoost : max;
  diver.vx = clamp(diver.vx, -max, max);
  diver.vy = clamp(diver.vy, -vmaxY, vmaxY);

  let fx = 0;
  for (const current of state.currents) {
    if (diver.x > current.x0 && diver.x < current.x1 && diver.y > current.y0 && diver.y < current.y1) fx += current.force;
  }

  diver.x += (diver.vx + fx) * dt;
  diver.y += diver.vy * dt;

  if (diver.y < DIVER_MIN_Y) {
    diver.y = DIVER_MIN_Y;
    if (diver.vy < 0) diver.vy = 0;
  }
  const floor = seabedY(state.seed, diver.x) - DIVER_RADIUS;
  if (diver.y > floor) {
    diver.y = floor;
    if (diver.vy > 0) diver.vy = 0;
  }

  if (Math.abs(diver.vx) > 12 && Math.abs(input.x) > 0.15) diver.facing = diver.vx > 0 ? 1 : -1;

  const speed = Math.hypot(diver.vx, diver.vy);
  state.swimTimer -= dt;
  if (speed > max * 0.6 && state.swimTimer <= 0) {
    sfx(state, 'swim', 0.25);
    state.swimTimer = 0.9;
  }
  state.bubbleTimer -= dt;
  if (state.bubbleTimer <= 0) {
    bubble(state, diver.x + diver.facing * 18, diver.y - 14, 5);
    if (Math.random() < 0.5) bubble(state, diver.x + diver.facing * 16, diver.y - 10, 3);
    state.bubbleTimer = 0.45 + Math.random() * 0.4;
  }
}
