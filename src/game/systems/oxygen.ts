import { PX_PER_M } from '../constants';
import { DEPTH_SCALE } from '../terrain';
import type { GameState } from '../types';
import { caveAt, inPocket } from '../world';
import { floatText, haptic, sfx } from './effects';
import { SUB_RADIUS } from './extras';
import { carriedWeight } from './movement';

export function oxygenDrain(depthM: number, weight: number): number {
  return (1 + depthM / (130 * DEPTH_SCALE)) * (1 + weight * 0.08);
}

export const SURFACE_BREATH_Y = 30;

export function updateOxygen(state: GameState, dt: number) {
  const { diver, stats } = state;
  const depthM = Math.max(0, diver.y / PX_PER_M);
  const pocket = caveAt(state, diver.x)?.pocket ?? null;
  diver.breathing = diver.y <= SURFACE_BREATH_Y;
  const wasInAir = diver.inAir;
  diver.inAir = inPocket(pocket, diver.x, diver.y);
  const wasAtSub = diver.atSub;
  diver.atSub = !!state.sub && Math.hypot(diver.x - state.sub.x, diver.y - state.sub.y) < SUB_RADIUS;
  if (diver.atSub) {
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * 0.1 * dt);
    if (!wasAtSub) {
      floatText(state, 'Kyslík z ponorky!', diver.x, diver.y - 40, '#20D4E8');
      sfx(state, 'bubbles', 0.8);
    }
    return;
  }
  if (diver.inAir) {
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * 0.12 * dt);
    if (!wasInAir) {
      state.record.pockets += 1;
      floatText(state, 'Vzduchová kapsa!', diver.x, diver.y - 40, '#20D4E8');
      sfx(state, 'bubbles', 0.8);
      if (!state.record.discoveries.includes('pocket')) state.record.discoveries.push('pocket');
    }
    return;
  }
  if (!diver.breathing) diver.oxygen -= oxygenDrain(depthM, carriedWeight(state)) * stats.drain * dt;
  if (diver.oxygen <= 0 && !diver.breathing) {
    diver.oxygen = 0;
    diver.health -= 9 * dt;
    state.lastDamage = 'oxygen';
  }
  const pct = diver.oxygen / stats.oxygenMax;
  state.alarmTimer -= dt;
  if (pct < 0.25 && state.alarmTimer <= 0 && !diver.breathing) {
    sfx(state, 'alarm', 0.5);
    state.events.push({ type: 'radio', topic: 'low_oxygen' });
    haptic(state, 'warning');
    state.alarmTimer = pct < 0.1 ? 1 : 1.8;
  }
}
