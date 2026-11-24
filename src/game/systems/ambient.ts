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
    } else if (p.kind === 'rain') {
      p.vy += 200 * dt;
      if (p.y > 2) p.life = 0;
    } else if (p.kind === 'ink' || p.kind === 'cloud') {
      p.vx *= Math.exp(-2 * dt);
      p.vy *= Math.exp(-2 * dt);
      p.size += dt * 18;
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

  if (state.particles.length < 80 && Math.random() < dt * 3) {
    for (const chunk of state.chunks.values()) {
      const cave = chunk.cave;
      if (!cave || Math.abs(chunk.x0 + 240 - state.camera.x) > 700) continue;
      const i = 2 + Math.floor(Math.random() * (cave.bottom.length - 4));
      const x = cave.x0 + i * 24;
      const floor = chunk.profile[i];
      const gap = floor - cave.bottom[i];
      if (gap < 30 || cave.bottom[i] - cave.top[i] < 10) continue;
      state.particles.push({ kind: 'bubble', x, y: floor - 8, vx: 0, vy: -45, life: gap / 70, maxLife: gap / 70, size: 3 + Math.random() * 4 });
    }
  }

  if (state.condition === 'storm' && state.camera.y < 60) {
    for (let i = 0; i < 3 && state.particles.length < 90; i++) {
      state.particles.push({ kind: 'rain', x: state.camera.x + (Math.random() - 0.5) * 1400, y: state.camera.y - 20, vx: -60, vy: 520, life: 1.2, maxLife: 1.2, size: 14 });
    }
  }

  if (state.currents.length > 0 && Math.random() < dt * 8) {
    for (const current of state.currents) {
      if (Math.abs(current.x0 - state.camera.x) > 900) continue;
      if (current.lift < 0) {
        state.particles.push({ kind: 'bubble', x: current.x0 + Math.random() * (current.x1 - current.x0), y: current.y1, vx: 0, vy: current.lift * 0.9, life: 2.4, maxLife: 2.4, size: 4 + Math.random() * 6 });
        continue;
      }
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
