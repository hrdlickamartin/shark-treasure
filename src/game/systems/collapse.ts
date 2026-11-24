import { HAZARD_DAMAGE } from '../catalog';
import { CHUNK_W, DIVER_RADIUS } from '../constants';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import type { Chunk, GameState } from '../types';
import { PROFILE_STEP } from '../world';
import { damageDiver } from './collision';
import { burst, floatText, haptic, sfx, shake } from './effects';

export const COLLAPSE_TIME = 18;
export const ROCK_INTERVAL = 1.2;
export const ROCK_WARN = 0.6;

function caveRange(chunk: Chunk): { x0: number; x1: number } {
  const cave = chunk.cave!;
  const solid = cave.top.map((t, i) => cave.bottom[i] - t > 8);
  const first = Math.max(0, solid.indexOf(true));
  const last = Math.max(first, solid.lastIndexOf(true));
  return { x0: cave.x0 + first * PROFILE_STEP, x1: cave.x0 + last * PROFILE_STEP };
}

function ceilingAt(chunk: Chunk, x: number): number {
  const cave = chunk.cave!;
  const f = (x - cave.x0) / PROFILE_STEP;
  const i = clamp(Math.floor(f), 0, cave.bottom.length - 2);
  const k = clamp(f - i, 0, 1);
  return cave.bottom[i] + (cave.bottom[i + 1] - cave.bottom[i]) * k;
}

export function insideCave(state: GameState, chunk: Chunk): boolean {
  const { diver } = state;
  const range = caveRange(chunk);
  return diver.x > range.x0 && diver.x < range.x1 && diver.y > ceilingAt(chunk, diver.x);
}

export function escapeDistance(chunk: Chunk, x: number): number {
  const range = caveRange(chunk);
  return Math.min(Math.abs(x - range.x0), Math.abs(range.x1 - x));
}

export function startCollapse(state: GameState, index: number) {
  const chunk = state.chunks.get(index);
  if (state.collapse || !chunk?.cave?.unstable || chunk.cave.collapsed) return;
  state.collapse = { index, time: COLLAPSE_TIME, next: ROCK_WARN };
  state.events.push({ type: 'toast', text: 'Jeskyně se hroutí! Rychle ven!' });
  state.events.push({ type: 'radio', topic: 'collapse' });
  sfx(state, 'crumble', 0.9);
  haptic(state, 'warning');
  shake(state, 10);
}

function closeCave(state: GameState, chunk: Chunk) {
  const cave = chunk.cave!;
  const bottom = cave.bottom.map((b, i) => (cave.bottom[i] - cave.top[i] > 8 ? Math.max(b, chunk.profile[i] - 4) : b));
  state.chunks.set(chunk.index, { ...chunk, cave: { ...cave, bottom, pocket: null, collapsed: true } });
}

export function updateCollapse(state: GameState, dt: number) {
  const { diver } = state;
  for (let i = state.rocks.length - 1; i >= 0; i--) {
    const rock = state.rocks[i];
    if (rock.warn > 0) {
      rock.warn -= dt;
      if (Math.random() < dt * 30) state.particles.push({ kind: 'sand', x: rock.x + (Math.random() - 0.5) * rock.size, y: rock.y, vx: (Math.random() - 0.5) * 10, vy: 60 + Math.random() * 40, life: 0.7, maxLife: 0.7, size: 3 + Math.random() * 2 });
      continue;
    }
    rock.vy = Math.min(420, rock.vy + 700 * dt);
    rock.y += rock.vy * dt;
    if (diver.state === 'diving' && Math.hypot(diver.x - rock.x, diver.y - rock.y) < DIVER_RADIUS + rock.size * 0.45) {
      damageDiver(state, HAZARD_DAMAGE.collapse, 'collapse', rock.x, rock.y - 30, false);
      burst(state, 'sand', rock.x, rock.y, 10, 90, 0.6, 4);
      state.rocks.splice(i, 1);
      continue;
    }
    if (rock.y >= rock.floor) {
      burst(state, 'sand', rock.x, rock.floor, 12, 100, 0.7, 4);
      burst(state, 'bubble', rock.x, rock.floor - 10, 4, 50, 0.8, 5);
      state.rocks.splice(i, 1);
    }
  }

  const near = state.chunks.get(Math.floor(diver.x / CHUNK_W));
  if (near?.cave?.unstable && !near.cave.collapsed && state.phase === 'dive' && Math.random() < dt * 2.5) {
    const range = caveRange(near);
    const x = range.x0 + Math.random() * (range.x1 - range.x0);
    state.particles.push({ kind: 'sand', x, y: ceilingAt(near, x), vx: 0, vy: 50, life: 1.4, maxLife: 1.4, size: 3 });
  }

  const collapse = state.collapse;
  if (!collapse) return;
  const chunk = state.chunks.get(collapse.index);
  if (!chunk?.cave) {
    state.collapse = null;
    return;
  }
  collapse.time -= dt;
  collapse.next -= dt;
  if (collapse.next <= 0 && collapse.time > 1) {
    collapse.next = ROCK_INTERVAL;
    const range = caveRange(chunk);
    const target = insideCave(state, chunk) ? diver.x + diver.vx * 0.5 + (Math.random() - 0.5) * 80 : range.x0 + Math.random() * (range.x1 - range.x0);
    const x = clamp(target, range.x0 + 16, range.x1 - 16);
    state.rocks.push({ id: ++state.entityId, x, y: ceilingAt(chunk, x) + 6, vy: 0, warn: ROCK_WARN, floor: floorAt(state, x) - 10, size: 38 + Math.random() * 18 });
    if (Math.random() < 0.5) sfx(state, 'crumble', 0.35);
    shake(state, 3);
  }
  if (collapse.time > 0) return;
  const trapped = diver.state === 'diving' && insideCave(state, chunk);
  closeCave(state, chunk);
  state.collapse = null;
  state.rocks = [];
  shake(state, 18);
  sfx(state, 'crumble', 1);
  const range = caveRange(chunk);
  for (let k = 0; k < 16; k++) burst(state, 'sand', range.x0 + ((range.x1 - range.x0) * k) / 15, ceilingAt(chunk, range.x0 + ((range.x1 - range.x0) * k) / 15), 3, 120, 0.9, 5);
  if (trapped) {
    diver.health = 0;
    state.lastDamage = 'collapse';
    return;
  }
  if (diver.state === 'diving') {
    state.record.escapes += 1;
    floatText(state, 'Unikl jsi z hroutící se jeskyně!', diver.x, diver.y - 60, '#65C83C');
    haptic(state, 'success');
  }
}
