import { chestSlots } from '../catalog';
import type { GameState } from '../types';
import { burst, floatText, haptic, sfx } from './effects';

export const CRANE_RANGE = 120;
export const CRANE_DEPTH = 220;
export const HOOK_Y = 150;

export function carriedSlots(state: GameState): number {
  return state.diver.carried.reduce((sum, c) => sum + chestSlots(c.kind), 0);
}

export function haulHeavy(state: GameState, label: string): boolean {
  const { diver, boat } = state;
  const index = diver.carried.findIndex((c) => c.kind === 'heavy');
  if (index < 0) return false;
  const [chest] = diver.carried.splice(index, 1);
  state.record.heavy += 1;
  state.balloons.push({ id: ++state.entityId, chest, x: boat.x + boat.shown * 40, y: 6, vx: 0, vy: 0, surfaced: true, phase: Math.random() * 6 });
  floatText(state, `${label}: těžká truhla je u lodi!`, diver.x, diver.y - 60, '#FFBF32');
  burst(state, 'bubble', diver.x, diver.y - 20, 12, 90, 1.2, 6);
  sfx(state, 'chest_open', 0.7);
  haptic(state, 'success');
  return true;
}

export function updateCrane(state: GameState) {
  const { diver, boat, stats } = state;
  if (!stats.crane || state.phase !== 'dive' || diver.state !== 'diving') return;
  if (Math.abs(diver.x - boat.x) > CRANE_RANGE || diver.y > CRANE_DEPTH) return;
  haulHeavy(state, 'Jeřáb');
}
