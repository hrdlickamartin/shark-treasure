import { type ReactNode, useSyncExternalStore } from 'react';

let tick = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => tick;

export function nextFrame() {
  tick = (tick + 1) % 1000000;
  listeners.forEach((listener) => listener());
}

export function useFrame() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function Live({ children }: { children: () => ReactNode }) {
  useFrame();
  return children();
}
