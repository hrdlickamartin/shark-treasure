import { PX_PER_M } from '../constants';
import { DEPTH_SCALE } from '../terrain';
import type { GameState } from '../types';
import { caveAt, inPocket } from '../world';
import { floatText, haptic, sfx } from './effects';
import { BELL_RADIUS, bellSpot, SUB_RADIUS } from './extras';
import { carriedWeight } from './movement';
import { inRift, ventLift } from './props';

export const RIFT_DRAIN = 0.5;
export const RESERVE_SECONDS = 8;

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
  if (state.variant === 'free') {
    diver.oxygen = stats.oxygenMax;
    return;
  }
  const bell = bellSpot(state);
  if (bell && !diver.bellUsed && Math.hypot(diver.x - bell.x, diver.y - bell.y) < BELL_RADIUS) {
    diver.bellUsed = true;
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * 0.5);
    floatText(state, 'Potápěčský zvon: +50 % kyslíku', diver.x, diver.y - 50, '#20D4E8');
    sfx(state, 'bubbles', 0.9);
    haptic(state, 'success');
  }
  const vent = ventLift(state);
  if (vent) {
    diver.oxygen = Math.min(stats.oxygenMax, diver.oxygen + stats.oxygenMax * 0.15 * dt);
    if (!state.record.discoveries.includes('vent')) {
      state.record.discoveries.push('vent');
      state.events.push({ type: 'toast', text: 'Dýchací průduch! Při výdechu doplní kyslík.' });
    }
    return;
  }
  const rift = inRift(state) ? RIFT_DRAIN : 1;
  if (!diver.breathing) diver.oxygen -= oxygenDrain(depthM, carriedWeight(state)) * stats.drain * rift * dt;
  if (diver.oxygen <= 0 && !diver.breathing && stats.reserve && !diver.reserveUsed) {
    diver.reserveUsed = true;
    diver.oxygen = RESERVE_SECONDS;
    floatText(state, 'Rezervní ventil!', diver.x, diver.y - 50, '#20D4E8');
    sfx(state, 'bubbles', 0.8);
  }
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
