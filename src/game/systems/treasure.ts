import { CHESTS, SHARKS } from '../catalog';
import { floorAt } from '../terrain';
import { RELIC_CHANCE, RELICS } from '../../progression/relics';
import { oceanOf } from '../oceans';
import type { ChestKind, GameState, RelicId } from '../types';
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
      const rest = floorAt(state, chest.x) - CHESTS[chest.kind].width * 0.32;
      if (chest.y >= rest) {
        chest.y = rest;
        chest.restY = rest;
        chest.falling = false;
        burst(state, 'bubble', chest.x, chest.y + 10, 6, 40, 1, 5);
      }
    }
    if (diver.state !== 'diving' || chest.pickupDelay > 0) continue;
    const dist = Math.hypot(diver.x - chest.x, diver.y - chest.y);
    if (dist < 360 && !state.seenChests.includes(chest.id)) state.seenChests.push(chest.id);
    if (dist >= 40) continue;
    if (state.hazards.some((h) => h.kind === 'crab' && h.alive && h.link === chest.id)) continue;
    if (diver.carried.length >= stats.capacity) {
      if (state.time - state.record.fullWarned > 2.5) {
        floatText(state, 'Plná síť! Vrať se na loď', diver.x, diver.y - 50, '#FFFFFF');
        state.record.fullWarned = state.time;
      }
      continue;
    }
    const info = CHESTS[chest.kind];
    state.chests.splice(i, 1);
    if (!chest.rolled) {
      chest.rolled = true;
      chest.relic = rollRelic(state, chest.kind, chest.boss, oceanOf(state).regions[chest.regionId]?.relicBoost ?? 1);
    }
    diver.carried.push({ id: chest.id, kind: chest.kind, value: chest.value, weight: info.weight, regionId: chest.regionId, relic: chest.relic, boss: chest.boss });
    if (chest.relic) floatText(state, 'Relikvie!', chest.x, chest.y - 95, '#AD65F5');
    if (chest.boss) {
      const boss = oceanOf(state).boss;
      const alive = state.sharks.some((s) => s.kind === boss && !s.dying);
      state.events.push({ type: 'toast', text: alive ? `Máš poklad! ${SHARKS[boss].name} tě pronásleduje – uteč!` : 'Máš poklad poraženého bosse!' });
    }
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
    const d = Math.hypot(diver.x - coin.x, diver.y - coin.y);
    if (stats.magnet > 0 && d < 30 + stats.magnet * 2.5) {
      coin.x += ((diver.x - coin.x) / d) * 220 * dt;
      coin.y += ((diver.y - coin.y) / d) * 220 * dt;
    }
    if (d < 30 + stats.magnet * 0.3) {
      state.coins.splice(i, 1);
      diver.coins += coin.value;
      floatText(state, `+${coin.value}`, coin.x, coin.y - 20);
      burst(state, 'spark', coin.x, coin.y, 4, 60, 0.4, 4);
      sfx(state, 'click', 0.6);
      haptic(state, 'light');
    }
  }
}

function rollRelic(state: GameState, kind: ChestKind, boss: boolean, boost: number): RelicId | null {
  const pending = RELICS.map((r) => r.id).filter((id) => !state.ownedRelics.includes(id) && !state.diver.carried.some((c) => c.relic === id) && !state.balloons.some((b) => b.chest.relic === id));
  if (pending.length === 0) return null;
  const chance = boss ? 1 : Math.min(1, (RELIC_CHANCE[kind] ?? 0) * boost);
  if (Math.random() >= chance) return null;
  return pending[Math.floor(Math.random() * pending.length)];
}
