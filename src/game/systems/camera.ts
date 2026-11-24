import { floorAt } from '../terrain';
import type { GameState, View } from '../types';

export function cameraTarget(state: GameState, view: View): { x: number; y: number } {
  const { diver, boat } = state;
  if (diver.state === 'boat') return { x: boat.x, y: -view.height * 0.42 };
  const x = diver.x;
  let y = diver.y - view.height * 0.46;
  const minY = -view.height * 0.42;
  const maxY = floorAt(state, x) + 70 - view.height;
  y = Math.max(minY, Math.min(Math.max(minY, maxY), y));
  return { x, y };
}

export function updateCamera(state: GameState, view: View, dt: number, snap = false) {
  const target = cameraTarget(state, view);
  const k = snap ? 1 : Math.min(1, dt * 4.5);
  state.camera.x += (target.x - state.camera.x) * k;
  state.camera.y += (target.y - state.camera.y) * k;
  state.camera.shake = Math.max(0, state.camera.shake - dt * 30);
  state.camera.offsetX = state.camera.shake > 0 ? (Math.random() - 0.5) * state.camera.shake : 0;
  state.camera.offsetY = state.camera.shake > 0 ? (Math.random() - 0.5) * state.camera.shake : 0;
}
