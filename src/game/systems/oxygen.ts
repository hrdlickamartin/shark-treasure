import { PX_PER_M } from '../constants';
import type { GameState } from '../types';
import { haptic, sfx } from './effects';
import { carriedWeight } from './movement';

export function oxygenDrain(depthM: number, weight: number): number {
  return (1 + depthM / 130) * (1 + weight * 0.08);
}

export function updateOxygen(state: GameState, dt: number) {
  const { diver, stats } = state;
  const depthM = Math.max(0, diver.y / PX_PER_M);
  diver.oxygen -= oxygenDrain(depthM, carriedWeight(state)) * dt;
  if (diver.oxygen <= 0) {
    diver.oxygen = 0;
    diver.health -= 9 * dt;
    state.lastDamage = 'oxygen';
  }
  const pct = diver.oxygen / stats.oxygenMax;
  state.alarmTimer -= dt;
  if (pct < 0.25 && state.alarmTimer <= 0) {
    sfx(state, 'alarm', 0.5);
    haptic(state, 'warning');
    state.alarmTimer = pct < 0.1 ? 1 : 1.8;
  }
}
