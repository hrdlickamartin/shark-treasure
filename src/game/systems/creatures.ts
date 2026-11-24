import { HAZARD_DAMAGE } from '../catalog';
import type { GameState, Hazard } from '../types';
import { damageDiver, ellipseHit } from './collision';
import { burst, floatText, sfx } from './effects';

export const ANGLER_SENSE = 150;
export const RAY_FIELD = 110;
export const SPIKE_CYCLE = 2.4;
export const SPIKE_WARN = 1.4;
export const SPIKE_OUT = 1.8;

export function spikePhase(h: Hazard): number {
  return (h.phase % SPIKE_CYCLE + SPIKE_CYCLE) % SPIKE_CYCLE;
}

export function spikeExtension(h: Hazard): number {
  const t = spikePhase(h);
  if (t < SPIKE_WARN) return 0.3;
  if (t < SPIKE_OUT) return 0.3 + ((t - SPIKE_WARN) / (SPIKE_OUT - SPIKE_WARN)) * 0.15;
  return 1;
}

export function updateAngler(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  h.cooldown = Math.max(0, h.cooldown - dt);
  const dx = diver.x - h.x;
  const dy = diver.y - h.y;
  const d = Math.hypot(dx, dy);
  if (h.state === 0) {
    h.x += (h.homeX + Math.sin(h.phase * 0.35) * 40 - h.x) * Math.min(1, dt * 0.8);
    h.y += (h.baseY + Math.sin(h.phase * 0.6) * 14 - h.y) * Math.min(1, dt * 0.8);
    if (Math.abs(dx) > 8) h.dir = dx > 0 ? 1 : -1;
    if (diver.state === 'diving' && d < ANGLER_SENSE && h.cooldown <= 0) {
      h.state = 1;
      h.timer = 0.45;
      h.vx = (dx / (d || 1)) * 430;
      h.vy = (dy / (d || 1)) * 430;
      sfx(state, 'shark', 0.5);
    }
  } else if (h.state === 1) {
    h.timer -= dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (diver.state === 'diving' && ellipseHit(diver.x, diver.y, h.x + h.dir * 30, h.y, 40, 30)) {
      damageDiver(state, HAZARD_DAMAGE.angler, 'angler', h.x, h.y, true);
      h.timer = 0;
    }
    if (h.timer <= 0) {
      h.state = 2;
      h.timer = 1.4;
      h.cooldown = 3;
    }
  } else {
    h.timer -= dt;
    h.x += (h.homeX - h.x) * Math.min(1, dt * 1.2);
    h.y += (h.baseY - h.y) * Math.min(1, dt * 1.2);
    if (h.timer <= 0) h.state = 0;
  }
}

export function updateRay(state: GameState, h: Hazard, dt: number) {
  const { diver } = state;
  const prevX = h.x;
  h.x = h.homeX + Math.sin(h.phase * 0.5) * h.size;
  h.y = h.baseY + Math.sin(h.phase * 1.1) * 20;
  if (Math.abs(h.x - prevX) > 0.01) h.dir = h.x > prevX ? 1 : -1;
  const d = Math.hypot(diver.x - h.x, diver.y - h.y);
  if (h.state === 0) {
    h.cooldown -= dt;
    if (h.cooldown <= 0 && d < 280 && diver.state === 'diving') {
      h.state = 1;
      h.timer = 0.9;
      sfx(state, 'zap', 0.35);
    }
  } else if (h.state === 1) {
    h.timer -= dt;
    if (h.timer <= 0) {
      h.state = 2;
      h.timer = 0.45;
      sfx(state, 'zap', 0.9);
      burst(state, 'spark', h.x, h.y, 14, 180, 0.4, 5);
      if (diver.state === 'diving' && d < RAY_FIELD) {
        if (damageDiver(state, HAZARD_DAMAGE.ray, 'ray', h.x, h.y, false)) diver.stun = 1;
      }
    }
  } else {
    h.timer -= dt;
    if (h.timer <= 0) {
      h.state = 0;
      h.cooldown = 3.5 + (h.phase % 1.5);
    }
  }
}

export function updateToxic(state: GameState, h: Hazard, dt: number) {
  const { diver, stats } = state;
  h.x = h.homeX + Math.sin(h.phase * 0.2) * 30;
  h.y = h.baseY + Math.cos(h.phase * 0.25) * 16;
  h.cooldown = Math.max(0, h.cooldown - dt);
  if (diver.state !== 'diving' || Math.hypot(diver.x - h.x, diver.y - h.y) > h.size) return;
  diver.health -= HAZARD_DAMAGE.toxic * stats.danger * (1 - stats.armor) * dt;
  diver.hurt = Math.max(diver.hurt, 0.15);
  state.lastDamage = 'toxic';
  if (h.cooldown <= 0) {
    h.cooldown = 1.2;
    floatText(state, 'Jed!', diver.x, diver.y - 40, '#7BE36A');
  }
}

export function updateSpikes(state: GameState, h: Hazard) {
  const { diver } = state;
  if (diver.state !== 'diving' || spikePhase(h) < SPIKE_OUT) return;
  const a = (h.angle * Math.PI) / 180;
  const cx = h.x + Math.sin(a) * 22;
  const cy = h.y - Math.cos(a) * 22;
  if (ellipseHit(diver.x, diver.y, cx, cy, 36, 30)) damageDiver(state, HAZARD_DAMAGE.spikes, 'spikes', h.x, h.y, false);
}
