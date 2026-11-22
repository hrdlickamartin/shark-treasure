import type { GameEvent, GameState, ParticleKind, SfxName } from '../types';

const MAX_PARTICLES = 70;

export function sfx(state: GameState, name: SfxName, volume?: number) {
  state.events.push({ type: 'sfx', name, volume });
}

export function haptic(state: GameState, kind: Extract<GameEvent, { type: 'haptic' }>['kind']) {
  state.events.push({ type: 'haptic', kind });
}

export function floatText(state: GameState, text: string, x: number, y: number, color = '#FFBF32') {
  state.texts.push({ id: ++state.textId, text, x, y, life: 1.4, color });
}

export function shake(state: GameState, amount: number) {
  state.camera.shake = Math.max(state.camera.shake, amount);
}

export function burst(
  state: GameState,
  kind: ParticleKind,
  x: number,
  y: number,
  count: number,
  speed: number,
  life: number,
  size: number,
) {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    state.particles.push({
      kind,
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.6),
    });
  }
}

export function bubble(state: GameState, x: number, y: number, size = 6) {
  if (state.particles.length >= MAX_PARTICLES) return;
  state.particles.push({
    kind: 'bubble',
    x,
    y,
    vx: (Math.random() - 0.5) * 12,
    vy: -40 - Math.random() * 30,
    life: 2.2,
    maxLife: 2.2,
    size: size * (0.6 + Math.random() * 0.7),
  });
}
