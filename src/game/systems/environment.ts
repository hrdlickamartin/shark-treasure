import { PX_PER_M } from '../constants';
import { oceanOf } from '../oceans';
import type { GameState } from '../types';
import { floatText, haptic, sfx } from './effects';
import { nearBeacon } from './props';

export const TEMP_MAX = 100;
const TEMP_DRAIN = 100 / 55;
const TEMP_RESTORE = 32;
const FREEZE_DAMAGE = 7;

export function pressureExcess(state: GameState): number {
  return Math.max(0, state.diver.y / PX_PER_M - state.stats.safeDepth);
}

export function updateEnvironment(state: GameState, dt: number) {
  const { diver, stats } = state;
  if (state.mode !== 'sea' || diver.state !== 'diving') return;
  const ocean = oceanOf(state);
  const excess = pressureExcess(state);
  if (excess > 0) {
    diver.health -= (2.5 + excess / 8) * dt;
    state.lastDamage = 'pressure';
    if (Math.floor(state.time * 1.2) !== Math.floor((state.time - dt) * 1.2)) {
      floatText(state, 'Tlak! Vystoupej výš', diver.x, diver.y - 50, '#FF7185');
      state.events.push({ type: 'radio', topic: 'pressure' });
      haptic(state, 'warning');
    }
  }
  if (!ocean.temperature) return;
  const warming = diver.breathing || diver.inAir || diver.atSub || nearBeacon(state);
  if (warming) {
    diver.temp = Math.min(TEMP_MAX, diver.temp + TEMP_RESTORE * dt);
    return;
  }
  const before = diver.temp;
  diver.temp = Math.max(0, diver.temp - TEMP_DRAIN * stats.thermal * dt);
  if (before >= 30 && diver.temp < 30) state.events.push({ type: 'radio', topic: ocean.temperature === 'cold' ? 'cold' : 'heat' });
  if (diver.temp <= 0) {
    diver.health -= FREEZE_DAMAGE * dt;
    state.lastDamage = ocean.temperature === 'cold' ? 'cold' : 'heat';
    if (Math.floor(state.time) !== Math.floor(state.time - dt)) {
      floatText(state, ocean.temperature === 'cold' ? 'Mrzneš!' : 'Přehříváš se!', diver.x, diver.y - 50, '#FF7185');
      sfx(state, 'alarm', 0.4);
    }
  }
}
