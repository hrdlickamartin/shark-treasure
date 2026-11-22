import { CHESTS } from '../catalog';
import { seabedY } from '../terrain';
import type { GameState } from '../types';
import { burst, floatText, haptic, sfx } from './effects';

export function updateTreasure(state: GameState, dt: number) {
  const { diver, stats } = state;
  diver.collectFlash = Math.max(0, diver.collectFlash - dt);

  for (let i = state.chests.length - 1; i >= 0; i--) {
    const chest = state.chests[i];
    chest.phase += dt;
    chest.pickupDelay = Math.max(0, chest.pickupDelay - dt);
    if (chest.falling) {
      chest.vy = Math.min(90, chest.vy + 60 * dt);
      chest.y += chest.vy * dt;
      const rest = seabedY(state.seed, chest.x) - CHESTS[chest.kind].width * 0.32;
      if (chest.y >= rest) {
        chest.y = rest;
        chest.restY = rest;
        chest.falling = false;
        burst(state, 'bubble', chest.x, chest.y + 10, 6, 40, 1, 5);
      }
    }
    if (diver.state !== 'diving' || chest.pickupDelay > 0) continue;
    const near = Math.hypot(diver.x - chest.x, diver.y - chest.y) < 40;
    if (!near) continue;
    if (diver.carried.length >= stats.capacity) {
      if (state.time - state.record.fullWarned > 2.5) {
        floatText(state, 'Plná síť! Vrať se na loď', diver.x, diver.y - 50, '#FFFFFF');
        state.record.fullWarned = state.time;
      }
      continue;
    }
    const info = CHESTS[chest.kind];
    state.chests.splice(i, 1);
    diver.carried.push({ id: chest.id, kind: chest.kind, value: chest.value, weight: info.weight, regionId: chest.regionId });
    diver.collectFlash = 0.6;
    floatText(state, `+${chest.value} $`, chest.x, chest.y - 40);
    if (chest.kind === 'mystery') floatText(state, 'Mystery!', chest.x, chest.y - 70, '#20D4E8');
    burst(state, 'coin', chest.x, chest.y, 14, 160, 0.9, 9);
    burst(state, 'spark', chest.x, chest.y, 10, 100, 0.6, 5);
    sfx(state, 'chest_open');
    sfx(state, 'collect');
    haptic(state, 'success');
  }

  for (let i = state.coins.length - 1; i >= 0; i--) {
    const coin = state.coins[i];
    coin.phase += dt;
    if (diver.state !== 'diving') continue;
    if (Math.hypot(diver.x - coin.x, diver.y - coin.y) < 30) {
      state.coins.splice(i, 1);
      diver.coins += coin.value;
      floatText(state, `+${coin.value}`, coin.x, coin.y - 20);
      burst(state, 'spark', coin.x, coin.y, 4, 60, 0.4, 4);
      sfx(state, 'click', 0.6);
      haptic(state, 'light');
    }
  }
}
