import { DIVER_ACCEL, DIVER_MIN_Y, DIVER_RADIUS } from '../constants';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import { caveAt } from '../world';
import type { GameState, Input } from '../types';
import { bubble, sfx } from './effects';
import { BOOST_SPEED } from './extras';
import { clampToShaft } from '../endless';
import { oceanEnd, oceanOf } from '../oceans';
import { currentForce, gateBlock } from './tide';

const HEARTSTONE_WEIGHT = 5;

export function carriedWeight(state: GameState): number {
  const stone = state.diver.cargo.some((id) => state.props.some((p) => p.id === id && p.kind === 'heartstone')) ? HEARTSTONE_WEIGHT : 0;
  return state.diver.carried.reduce((sum, c) => sum + c.weight, 0) + stone;
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
  const sail = stats.stormSail && state.condition === 'storm' ? 1.3 : 1;
  const target = input.x * stats.boatSpeed * sail * (reversing ? 0.35 : boat.turnFx > 0 ? 0.2 : 1);
  boat.vx += (target - boat.vx) * Math.min(1, dt * 2.5);
  let next = boat.x + boat.vx * dt;
  const limit = state.mode === 'endless' ? 160 : oceanEnd(oceanOf(state)) - 140;
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
  const boost = state.boostTime > 0 ? BOOST_SPEED : 1;
  max *= boost;
  if (diver.turnBoost > 0) max *= 1.3;

  const mag = Math.hypot(input.x, input.y);
  const ix = mag > 1 ? input.x / mag : input.x;
  const iy = mag > 1 ? input.y / mag : input.y;
  const upBoost = iy < 0 ? stats.ascent : 1;

  diver.vx += ix * DIVER_ACCEL * boost * dt;
  diver.vy += iy * DIVER_ACCEL * upBoost * boost * dt;
  if (Math.abs(ix) < 0.1) diver.vx *= Math.exp(-4 * dt);
  if (Math.abs(iy) < 0.1) diver.vy *= Math.exp(-4 * dt);

  let fx = 0;
  let fy = 0;
  for (const current of state.currents) {
    if (diver.x > current.x0 && diver.x < current.x1 && diver.y > current.y0 && diver.y < current.y1) {
      fx += currentForce(state, current.force, current.tidal);
      fy += current.lift;
    }
  }
  if (fx !== 0 && stats.racer) max *= 1.12;

  const vmaxY = iy < 0 ? max * upBoost : max;
  diver.vx = clamp(diver.vx, -max, max);
  diver.vy = clamp(diver.vy, -vmaxY, vmaxY);

  if (state.condition === 'storm') fx += Math.sin(state.time * 0.6) * 45 + Math.sin(state.time * 1.7) * 15;
  if (diver.anchor > 0) {
    fx = 0;
    fy = 0;
    if (Math.random() < dt * 8) bubble(state, diver.x, diver.y + 18, 3);
  }

  const prevY = diver.y;
  const prevX = diver.x;
  diver.x += (diver.vx + fx) * dt;
  diver.y += (diver.vy + fy) * dt;
  const gated = gateBlock(state, prevX, diver.x, diver.y, DIVER_RADIUS + 6);
  if (gated !== diver.x) {
    diver.x = gated;
    diver.vx = 0;
  }

  if (diver.y < DIVER_MIN_Y) {
    diver.y = DIVER_MIN_Y;
    if (diver.vy < 0) diver.vy = 0;
  }
  const floor = floorAt(state, diver.x) - DIVER_RADIUS;
  if (diver.y > floor) {
    diver.y = floor;
    if (diver.vy > 0) diver.vy = 0;
  }

  if (state.mode === 'endless') {
    const x = clampToShaft(state, diver.x, diver.y, DIVER_RADIUS);
    if (x !== diver.x) diver.vx = 0;
    diver.x = x;
  }

  const cave = caveAt(state, diver.x);
  const dome = cave?.pocket && Math.abs(diver.x - cave.pocket.x) < cave.pocket.r - 8 ? cave.pocket : null;
  if (cave && dome && diver.y < cave.bottom + DIVER_RADIUS && prevY > cave.top) {
    diver.y = Math.max(diver.y, dome.y - dome.r + 16);
    if (diver.y < cave.bottom) diver.x = clamp(diver.x, dome.x - dome.r + 12, dome.x + dome.r - 12);
  } else if (cave && diver.y > cave.top - DIVER_RADIUS && diver.y < cave.bottom + DIVER_RADIUS) {
    if (prevY >= (cave.top + cave.bottom) / 2) {
      diver.y = cave.bottom + DIVER_RADIUS;
      if (diver.vy < 0) diver.vy = 0;
    } else {
      diver.y = cave.top - DIVER_RADIUS;
      if (diver.vy > 0) diver.vy = 0;
    }
    if (!state.record.discoveries.includes('cave')) {
      state.record.discoveries.push('cave');
      state.events.push({ type: 'toast', text: 'Objevil jsi jeskyni! Hledej vzduchové kapsy.' });
    }
  }

  if (Math.abs(diver.vx) > 12 && Math.abs(input.x) > 0.15) {
    const facing = diver.vx > 0 ? 1 : -1;
    if (facing !== diver.facing && stats.quickStart) diver.turnBoost = 2;
    diver.facing = facing;
  }

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
