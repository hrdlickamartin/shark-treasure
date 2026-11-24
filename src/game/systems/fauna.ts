import { HAZARD_DAMAGE } from '../catalog';
import { SURFACE_SAFE } from '../constants';
import { clamp } from '../rng';
import { floorAt } from '../terrain';
import type { GameState, Hazard } from '../types';
import { damageDiver, ellipseHit } from './collision';
import { burst, floatText, haptic, sfx } from './effects';
import { lit } from './kit';
import { riftAt } from './props';
import { tideInfo } from './tide';

export const BARRACUDA_SPEED = 230;
export const BARRACUDA_SPAN = 520;
export const BARRACUDA_GAP = 30;
export const SIPHON_GAP = 34;
export const PISTOL_RANGE = 170;
export const PISTOL_BLAST = 120;
export const PISTOL_WARN = 0.6;
export const SHADOW_SPEED = 70;

const diving = (state: GameState) => state.diver.state === 'diving';

export function barracudaMembers(h: Hazard): { x: number; y: number }[] {
  return Array.from({ length: h.size }, (_, i) => ({ x: h.x - h.dir * i * BARRACUDA_GAP, y: h.y + Math.sin(h.phase * 3 + i * 0.9) * 8 + (i % 2 ? 10 : -6) }));
}

export function siphonSegments(h: Hazard): { x: number; y: number }[] {
  const trail = h.vx >= 0 ? -1 : 1;
  return Array.from({ length: h.size }, (_, i) => ({ x: h.x + trail * i * SIPHON_GAP, y: h.y + Math.sin(h.phase * 1.6 + i * 0.8) * 10 }));
}

export function updateMimic(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  if (h.state === 2) {
    h.timer -= dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.timer <= 0) h.alive = false;
    return;
  }
  if (h.state === 0 && state.sonarTime > 0 && Math.hypot(diver.x - h.x, diver.y - h.y) < state.stats.sonarRange) {
    h.state = 1;
    floatText(state, 'Sonar: tahle truhla dýchá!', h.x, h.y - 40, '#C8B6FF');
  }
  if (!diving(state) || Math.hypot(diver.x - h.x, diver.y - h.y) > 40) return;
  const stolen = Math.min(diver.coins, 20 + Math.round(h.size));
  diver.coins -= stolen;
  h.state = 2;
  h.timer = 1.4;
  h.vx = (h.x > diver.x ? 1 : -1) * 150;
  h.vy = -90;
  state.inkTime = 1.2;
  for (let i = 0; i < 10; i++) {
    state.particles.push({ kind: 'ink', x: h.x, y: h.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 1.6, maxLife: 1.6, size: 16 + Math.random() * 16 });
  }
  floatText(state, stolen > 0 ? `Mimikry! Ukradla ${stolen} mincí` : 'Mimikry! To nebyla truhla', h.x, h.y - 40, '#C8B6FF');
  sfx(state, 'drop', 0.7);
  haptic(state, 'warning');
  if (!state.record.discoveries.includes('mimic')) {
    state.record.discoveries.push('mimic');
    state.events.push({ type: 'toast', text: 'Mimikry chobotnice! Sonar nebo Pip prozradí, která truhla dýchá.' });
  }
}

export function updateBarracuda(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  if (h.timer > 0) {
    h.timer -= dt;
  } else {
    h.x += h.dir * BARRACUDA_SPEED * state.stats.sharkSpeed * dt;
    if ((h.x - h.homeX) * h.dir > BARRACUDA_SPAN) {
      h.dir = h.dir === 1 ? -1 : 1;
      h.timer = 0.9;
    }
  }
  h.y = clamp(h.baseY + Math.sin(h.phase * 0.5) * 30, SURFACE_SAFE + 40, floorAt(state, h.x) - 60);
  if (!diving(state) || Math.abs(diver.x - h.x) > h.size * BARRACUDA_GAP + 40) return;
  for (const m of barracudaMembers(h)) {
    if (ellipseHit(diver.x, diver.y, m.x, m.y, 30, 20)) {
      if (damageDiver(state, HAZARD_DAMAGE.barracuda, 'barracuda', m.x - h.dir * 20, m.y, false)) burst(state, 'spark', diver.x, diver.y, 6, 80, 0.4, 4);
      break;
    }
  }
}

export function updateSiphon(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  const tide = tideInfo(state);
  const drift = 26 * tide.sign;
  h.vx += (drift - h.vx) * Math.min(1, dt);
  h.x += h.vx * dt;
  if (Math.abs(h.x - h.homeX) > 320) h.x = h.homeX + Math.sign(h.x - h.homeX) * 320;
  h.y = h.baseY + Math.sin(h.phase * 0.7) * 16;
  if (!diving(state) || diver.immune > 0) return;
  for (const seg of siphonSegments(h)) {
    if (ellipseHit(diver.x, diver.y, seg.x, seg.y + 8, 30, 34)) {
      if (damageDiver(state, HAZARD_DAMAGE.siphon, 'siphon', seg.x, seg.y, false)) {
        diver.stun = 0.8;
        sfx(state, 'zap', 0.7);
        burst(state, 'spark', diver.x, diver.y, 8, 80, 0.4, 4);
      }
      break;
    }
  }
}

export function updatePistol(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  h.cooldown = Math.max(0, h.cooldown - dt);
  const dx = diver.x - h.x;
  const dy = diver.y - h.y;
  if (h.state === 0) {
    if (diving(state) && Math.abs(dy) < 80 && Math.abs(dx) < PISTOL_RANGE) {
      if (Math.sign(dx) !== h.dir) {
        h.timer += dt;
        if (h.timer > 1.6) {
          h.dir = h.dir === 1 ? -1 : 1;
          h.timer = 0;
        }
      } else if (h.cooldown <= 0) {
        h.state = 1;
        h.timer = PISTOL_WARN;
        floatText(state, 'cvak!', h.x + h.dir * 20, h.y - 30, '#FFFFFF');
        sfx(state, 'click', 1);
      }
    }
    return;
  }
  if (h.state === 1) {
    h.timer -= dt;
    if (h.timer > 0) return;
    h.state = 2;
    h.timer = 0.4;
    h.cooldown = 3;
    const bx = h.x + h.dir * 40;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      state.particles.push({ kind: 'ring', x: bx, y: h.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 0.35, maxLife: 0.35, size: 6 });
    }
    burst(state, 'bubble', bx, h.y, 10, 120, 0.6, 5);
    sfx(state, 'mine', 0.4);
    if (diving(state) && Math.hypot(diver.x - bx, diver.y - h.y) < PISTOL_BLAST) {
      damageDiver(state, HAZARD_DAMAGE.pistol, 'pistol', bx, h.y, false);
      diver.stun = 1;
    }
    return;
  }
  h.timer -= dt;
  if (h.timer <= 0) h.state = 0;
}

export function updateShadow(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  const lightOn = lit(state, h.x, h.y);
  h.state = lightOn ? 1 : 0;
  const rift = riftAt(state, diver.x, diver.y) ?? riftAt(state, h.x, h.y);
  const hunting = diving(state) && !!rift && Math.hypot(diver.x - h.x, diver.y - h.y) < 520;
  let tvx = Math.sin(h.phase * 0.6) * 30;
  let tvy = Math.cos(h.phase * 0.8) * 18;
  if (hunting) {
    const dx = diver.x - h.x;
    const dy = diver.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    const sign = lightOn ? -1 : 1;
    tvx = (dx / d) * SHADOW_SPEED * sign * state.stats.sharkSpeed;
    tvy = (dy / d) * SHADOW_SPEED * sign * state.stats.sharkSpeed;
  } else {
    tvx += (h.homeX - h.x) * 0.3;
  }
  h.vx += (tvx - h.vx) * Math.min(1, dt * 2);
  h.vy += (tvy - h.vy) * Math.min(1, dt * 2);
  h.x += h.vx * dt;
  h.y = clamp(h.y + h.vy * dt, SURFACE_SAFE + 30, floorAt(state, h.x) + 40);
  if (Math.abs(h.vx) > 5) h.dir = h.vx > 0 ? 1 : -1;
  if (!lightOn && diving(state) && ellipseHit(diver.x, diver.y, h.x, h.y, 60, 30)) damageDiver(state, HAZARD_DAMAGE.shadow, 'shadow', h.x, h.y, false);
}
