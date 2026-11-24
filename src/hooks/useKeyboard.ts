import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { Input } from '../game/types';

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];

export function useKeyboard(onAction: () => void, onPause: () => void, onKey: (code: string) => void) {
  const pressed = useRef(new Set<string>());
  const input = useRef<Input>({ x: 0, y: 0 });
  const handlers = useRef({ onAction, onPause, onKey });
  handlers.current = { onAction, onPause, onKey };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const keys = pressed.current;
    const recompute = () => {
      const has = (codes: string[]) => codes.some((c) => keys.has(c));
      input.current = {
        x: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        y: (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0),
      };
    };
    const down = (e: KeyboardEvent) => {
      if ([...LEFT, ...RIGHT, ...UP, ...DOWN, 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) handlers.current.onAction();
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) handlers.current.onPause();
      if (!e.repeat) handlers.current.onKey(e.code);
      keys.add(e.code);
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      recompute();
    };
    const blur = () => {
      keys.clear();
      recompute();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return input;
}
