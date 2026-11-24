import { DEFAULT_TIDE, oceanOf } from '../oceans';
import type { GameState, Prop } from '../types';
import { floatText, sfx } from './effects';

export const TIDE_WARNING = 8;
export const GATE_HEIGHT = 250;
export const GATE_LEVER_TIME = 20;
export const AGAINST_CURRENT = 0.55;

export interface TideInfo {
  active: boolean;
  period: number;
  high: boolean;
  remaining: number;
  factor: number;
  sign: 1 | -1;
  strong: boolean;
}

export function tideInfo(state: GameState): TideInfo {
  const ocean = oceanOf(state);
  const spec = ocean.tide ?? DEFAULT_TIDE;
  const active = state.mode === 'sea' && (state.expansion || !!ocean.tide);
  const period = spec.period * state.tideScale;
  const half = period / 2;
  const t = ((state.time % period) + period) % period;
  const high = !active || t < half;
  return {
    active,
    period,
    high,
    remaining: high ? half - t : period - t,
    factor: high ? 1 : 1 - 0.6 * spec.strength,
    sign: high ? 1 : -1,
    strong: spec.strength >= 0.6,
  };
}

export function currentForce(state: GameState, force: number, tidal: boolean | undefined): number {
  const tide = tideInfo(state);
  if (!tide.active) return force;
  return force * tide.factor * (tidal ? tide.sign : 1);
}

export function gateOpen(state: GameState, gate: Prop): boolean {
  return state.tideHigh || gate.progress > 0;
}

export function updateTide(state: GameState, dt: number) {
  const tide = tideInfo(state);
  if (!tide.active) return;
  const { diver } = state;
  if (tide.high !== state.tideHigh) {
    state.tideHigh = tide.high;
    state.tideWarned = false;
    if (state.phase === 'dive' && diver.state === 'diving') {
      floatText(state, tide.high ? 'Příliv!' : 'Odliv!', diver.x, diver.y - 60, '#63C9FF');
      for (let i = 0; i < 16; i++) {
        state.particles.push({ kind: 'streak', x: diver.x + (Math.random() - 0.5) * 500, y: diver.y + (Math.random() - 0.5) * 260, vx: tide.sign * (220 + Math.random() * 120), vy: 0, life: 0.9, maxLife: 0.9, size: 16 + Math.random() * 18 });
      }
    }
  } else if (!state.tideWarned && tide.remaining <= TIDE_WARNING && tide.strong) {
    state.tideWarned = true;
    sfx(state, 'horn', 0.7);
    if (state.phase === 'dive' && diver.state === 'diving') state.events.push({ type: 'radio', topic: tide.high ? 'tide_low' : 'tide_high' });
  }
  for (const gate of state.props) {
    if (gate.kind !== 'gate') continue;
    gate.progress = Math.max(0, gate.progress - dt);
    const open = gateOpen(state, gate);
    gate.phase = Math.max(0, Math.min(1, gate.phase + (open ? 1 : -1) * dt * 1.4));
    if (open !== gate.active) {
      gate.active = open;
      if (Math.abs(gate.x - diver.x) < 700 && state.phase === 'dive') sfx(state, 'gate', 0.6);
    }
  }
}

export function gateBlock(state: GameState, prevX: number, nextX: number, y: number, radius: number): number {
  for (const gate of state.props) {
    if (gate.kind !== 'gate') continue;
    if (y < gate.y - GATE_HEIGHT || y > gate.y + 10) continue;
    const crossed = (prevX - gate.x) * (nextX - gate.x) <= 0 && prevX !== nextX;
    if (!crossed) continue;
    if (gate.active) {
      const key = `gate:${gate.id}`;
      if (!state.record.activated.includes(key)) {
        state.record.activated.push(key);
        state.record.gates += 1;
        floatText(state, 'Proplul jsi bránou', gate.x, gate.y - GATE_HEIGHT - 20, '#20D4E8');
      }
      continue;
    }
    if (gate.value <= 0) {
      gate.value = 1;
      floatText(state, 'Brána je zavřená – počkej na příliv, nebo zatáhni za páku', gate.x, gate.y - GATE_HEIGHT - 20, '#A9C8EC');
    }
    return gate.x - Math.sign(gate.x - prevX || 1) * radius;
  }
  return nextX;
}
