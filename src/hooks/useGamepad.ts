import { useRef } from 'react';
import { Platform } from 'react-native';
import type { Input } from '../game/types';

export type PadButton = 'action' | 'balloon' | 'harpoon' | 'pip' | 'kit' | 'cycle' | 'camera' | 'pause' | 'medkit' | 'scooter';

const MAP: Record<number, PadButton> = {
  0: 'action',
  1: 'balloon',
  2: 'harpoon',
  3: 'pip',
  4: 'kit',
  5: 'cycle',
  6: 'medkit',
  7: 'camera',
  9: 'pause',
  10: 'scooter',
};

const DEAD_ZONE = 0.2;

export interface PadState {
  input: Input;
  pressed: PadButton[];
  connected: boolean;
}

const EMPTY: PadState = { input: { x: 0, y: 0 }, pressed: [], connected: false };

export function useGamepad() {
  const held = useRef<Record<number, boolean>>({});
  return () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.getGamepads) return EMPTY;
    const pad = Array.from(navigator.getGamepads()).find((p) => !!p);
    if (!pad) return EMPTY;
    const pressed: PadButton[] = [];
    pad.buttons.forEach((button, i) => {
      const down = button.pressed || button.value > 0.5;
      if (down && !held.current[i] && MAP[i]) pressed.push(MAP[i]);
      held.current[i] = down;
    });
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    const dpadX = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
    const dpadY = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0);
    const x = dpadX || (Math.abs(ax) > DEAD_ZONE ? ax : 0);
    const y = dpadY || (Math.abs(ay) > DEAD_ZONE ? ay : 0);
    return { input: { x, y }, pressed, connected: true };
  };
}
