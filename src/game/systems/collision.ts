import { CHESTS } from '../catalog';
import type { DamageSource, GameState } from '../types';
import { burst, floatText, haptic, sfx, shake } from './effects';

export function damageDiver(state: GameState, amount: number, source: DamageSource, fromX: number, fromY: number, dropChest: boolean) {
  const { diver, stats } = state;
  if (diver.invuln > 0 || diver.state !== 'diving') return false;
  const dealt = amount * (1 - stats.armor);
  diver.health -= dealt;
  diver.oxygen = Math.max(0, diver.oxygen - (source === 'shark' ? 5 : 3));
  diver.invuln = 1.4;
  diver.hurt = 0.55;
  const dx = diver.x - fromX;
  const dy = diver.y - fromY;
  const len = Math.hypot(dx, dy) || 1;
  diver.vx = (dx / len) * 280;
  diver.vy = (dy / len) * 280;
  state.lastDamage = source;
  state.record.hits += 1;
  floatText(state, `-${Math.round(dealt)}`, diver.x, diver.y - 40, '#FF7185');
  burst(state, 'spark', diver.x, diver.y, 8, 120, 0.5, 5);
  sfx(state, 'hurt');
  haptic(state, 'heavy');
  shake(state, source === 'mine' ? 18 : 10);
  if (dropChest && diver.carried.length > 0) {
    const lost = diver.carried.pop()!;
    state.chests.push({
      id: lost.id,
      kind: lost.kind,
      x: diver.x,
      y: diver.y,
      restY: diver.y,
      value: lost.value,
      regionId: lost.regionId,
      falling: true,
      vy: 20,
      phase: 0,
      pickupDelay: 1.8,
    });
    floatText(state, `Ztratil jsi ${CHESTS[lost.kind].name.toLowerCase()}!`, diver.x, diver.y - 64, '#FF7185');
    sfx(state, 'drop');
  }
  return true;
}

export function ellipseHit(ax: number, ay: number, bx: number, by: number, rx: number, ry: number): boolean {
  const dx = (ax - bx) / rx;
  const dy = (ay - by) / ry;
  return dx * dx + dy * dy < 1;
}
