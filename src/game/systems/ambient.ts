import type { GameState } from '../types';

export function updateAmbient(state: GameState, dt: number) {
  const particles = state.particles;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.kind === 'bubble') {
      p.vx += Math.sin((p.life + p.x) * 6) * 20 * dt;
      p.vy -= 10 * dt;
      if (p.y < 4) p.life = 0;
    } else if (p.kind === 'coin') {
      p.vy += 260 * dt;
      p.vx *= Math.exp(-1.5 * dt);
    } else if (p.kind === 'splash') {
      p.vy += 400 * dt;
    } else {
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  for (let i = state.texts.length - 1; i >= 0; i--) {
    const t = state.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) state.texts.splice(i, 1);
  }

  for (const school of state.fish) {
    school.phase += dt;
    school.x += school.vx * dt;
    if (school.x > school.maxX) school.vx = -Math.abs(school.vx);
    if (school.x < school.minX) school.vx = Math.abs(school.vx);
    const d = Math.hypot(state.diver.x - school.x, state.diver.y - school.y);
    if (d < 90 && state.diver.state === 'diving') {
      school.vx = Math.sign(school.x - state.diver.x || 1) * 110;
    } else if (Math.abs(school.vx) > 50) {
      school.vx *= Math.exp(-0.8 * dt);
    }
  }

  if (state.currents.length > 0 && Math.random() < dt * 8) {
    for (const current of state.currents) {
      if (Math.abs(current.x0 - state.camera.x) > 900) continue;
      state.particles.push({
        kind: 'streak',
        x: current.force > 0 ? current.x0 + Math.random() * 120 : current.x1 - Math.random() * 120,
        y: current.y0 + Math.random() * (current.y1 - current.y0),
        vx: current.force * 3,
        vy: 0,
        life: 1.6,
        maxLife: 1.6,
        size: 30 + Math.random() * 30,
      });
    }
  }
}
