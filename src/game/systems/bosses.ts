import { SHARKS } from '../catalog';
import { SURFACE_SAFE } from '../constants';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import type { GameState, Shark } from '../types';
import { burst, floatText, sfx, shake } from './effects';

export const MAELSTROM_RADIUS = 330;
export const MAELSTROM_FAST = 0.75;
export const MAELSTROM_SLOW = 0.3;
const HOLLOW_REACH = 230;

function steer(shark: Shark, tvx: number, tvy: number, rate: number, dt: number) {
  const k = Math.min(1, dt * rate);
  shark.vx += (tvx - shark.vx) * k;
  shark.vy += (tvy - shark.vy) * k;
}

export function vortexGates(state: GameState): number {
  return state.props.filter((p) => p.tag === 'vortex' && p.active).length;
}

export function chainsLeft(state: GameState): number {
  return state.props.filter((p) => p.kind === 'chain' && p.tag === 'boss' && !p.taken).length;
}

export function bossVulnerable(state: GameState, shark: Shark): boolean {
  if (shark.kind === 'maelstrom') return !state.tideHigh;
  if (shark.kind === 'hollow') return chainsLeft(state) === 0;
  return true;
}

export function updateMaelstrom(state: GameState, shark: Shark, dt: number) {
  const vulnerable = bossVulnerable(state, shark);
  shark.exposed = vulnerable;
  const radius = MAELSTROM_RADIUS * (1 - 0.22 * vortexGates(state));
  const speed = vulnerable ? MAELSTROM_SLOW : MAELSTROM_FAST;
  shark.targetX += speed * dt;
  const a = shark.targetX;
  const cx = shark.homeX + Math.cos(a) * radius;
  const cy = clamp(shark.homeY + Math.sin(a) * radius * 0.45, SURFACE_SAFE + 60, floorAt(state, cx) - 90);
  const dx = cx - shark.x;
  const dy = cy - shark.y;
  steer(shark, dx * 2.2, dy * 2.2, 3, dt);
  shark.phase += dt * (vulnerable ? 4 : 10);
  shark.mode = vulnerable ? 'tired' : 'charge';
  shark.alert = Math.max(0, shark.alert - dt);
  if (!vulnerable && Math.random() < dt * 10) {
    state.particles.push({ kind: 'streak', x: shark.x - shark.facing * 120, y: shark.y + (Math.random() - 0.5) * 60, vx: -shark.vx * 0.3, vy: 0, life: 0.6, maxLife: 0.6, size: 18 });
  }
  const { diver } = state;
  if (diver.state === 'diving' && !vulnerable && Math.hypot(diver.x - shark.x, diver.y - shark.y) < radius + 160) {
    const pull = 40 * dt;
    diver.vx += Math.sign(shark.homeX - diver.x) * pull;
  }
}

export function updateHollow(state: GameState, shark: Shark, dt: number) {
  const { diver } = state;
  const info = SHARKS.hollow;
  const exposed = chainsLeft(state) === 0;
  shark.exposed = exposed;
  const floor = floorAt(state, shark.x) - 70;
  shark.phase += dt * (shark.mode === 'lunge' ? 10 : 3);
  shark.lungeCooldown = Math.max(0, shark.lungeCooldown - dt);
  const dx = diver.x - shark.x;
  const near = diver.state === 'diving' && Math.abs(dx) < HOLLOW_REACH && Math.abs(diver.y - shark.y) < 160;
  switch (shark.mode) {
    case 'telegraph': {
      shark.timer -= dt;
      steer(shark, 0, 0, 6, dt);
      if (shark.timer <= 0) {
        shark.mode = 'lunge';
        shark.timer = 0.45;
        shark.vx = Math.sign(dx || shark.facing) * (exposed ? 380 : 300);
        sfx(state, 'shark', 0.8);
        shake(state, 6);
      }
      break;
    }
    case 'lunge': {
      shark.timer -= dt;
      if (shark.timer <= 0) {
        shark.mode = 'tired';
        shark.timer = exposed ? 1.6 : 1;
        shark.vx *= 0.2;
        shark.lungeCooldown = exposed ? 2.2 : 1.6;
      }
      break;
    }
    case 'tired': {
      shark.timer -= dt;
      steer(shark, 0, 0, 3, dt);
      if (shark.timer <= 0) shark.mode = 'patrol';
      break;
    }
    default: {
      if (shark.x > shark.homeX + shark.range) shark.facing = -1;
      if (shark.x < shark.homeX - shark.range) shark.facing = 1;
      steer(shark, shark.facing * info.patrol * (exposed ? 1.6 : 1), 0, 2, dt);
      if (near && shark.lungeCooldown <= 0) {
        shark.mode = 'telegraph';
        shark.timer = 0.7;
        shark.facing = dx > 0 ? 1 : -1;
        floatText(state, 'Klepeta!', shark.x + shark.facing * 120, shark.y - 80, '#FF7185');
      }
    }
  }
  shark.y += (floor - shark.y) * Math.min(1, dt * 4);
  shark.vy = 0;
  if (exposed && Math.random() < dt * 3) burst(state, 'bubble', shark.x, shark.y - 60, 2, 30, 0.8, 5);
}

export function deflectHarpoon(state: GameState, shark: Shark) {
  burst(state, 'spark', shark.x, shark.y, 10, 120, 0.4, 5);
  sfx(state, 'click', 1);
  floatText(state, shark.kind === 'maelstrom' ? 'Odrazilo se! Počkej na odliv' : 'Odrazilo se od ulity! Přetni řetězy', shark.x, shark.y - 70, '#A9C8EC');
}
