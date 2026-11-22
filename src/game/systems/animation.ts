import { ACTIVE_RANGE } from '../constants';
import { clamp } from '../rng';
import type { GameState } from '../types';

const approach = (value: number, target: number, rate: number, dt: number) => value + (target - value) * Math.min(1, dt * rate);
const steady = (value: number, target: number, speed: number, dt: number) =>
  value < target ? Math.min(target, value + speed * dt) : Math.max(target, value - speed * dt);

export function updateAnimation(state: GameState, dt: number) {
  const { diver, stats } = state;
  const anim = diver.anim;
  const speed = Math.hypot(diver.vx, diver.vy);
  const swimming = diver.state === 'diving' && speed > 22;

  anim.kick += dt * (diver.state === 'climbing' ? 10 : 3.5 + (speed / stats.speed) * 8);
  anim.turn = steady(anim.turn, diver.facing, 5.5, dt);
  anim.still = swimming || Math.abs(anim.turn - diver.facing) > 0.05 ? 0 : anim.still + dt;
  const idleTarget = diver.state === 'boat' || (diver.state === 'diving' && anim.still > 0.4) ? 1 : 0;
  anim.idle = approach(anim.idle, idleTarget, 9, dt);

  let tiltTarget = 0;
  if (diver.state === 'climbing') tiltTarget = -70;
  else if (swimming) tiltTarget = clamp((Math.atan2(diver.vy, Math.abs(diver.vx) + 1) * 180) / Math.PI, -60, 60);
  anim.tilt = approach(anim.tilt, tiltTarget, 6, dt);

  const boat = state.boat;
  boat.turnFx = Math.max(0, boat.turnFx - dt / 0.4);
  if (boat.turnFx < 0.5) boat.shown = boat.facing;

  for (const shark of state.sharks) {
    if (Math.abs(shark.x - state.camera.x) > ACTIVE_RANGE) continue;
    shark.turn = steady(shark.turn, shark.facing, 4, dt);
    const target = clamp((Math.atan2(shark.vy, Math.abs(shark.vx) + 1) * 180) / Math.PI, -28, 28);
    shark.tilt = approach(shark.tilt, target, 4, dt);
  }
}
