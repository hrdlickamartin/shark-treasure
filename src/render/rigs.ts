import type { SpriteName } from './spriteAssets';

export interface RigDef {
  cuts: [number, number];
  pivots: [number, number];
}

export const RIGS: Partial<Record<SpriteName, RigDef>> = {
  diver_carry: { cuts: [0.4, 0.22], pivots: [0.66, 0.66] },
  diver_swim1: { cuts: [0.37, 0.22], pivots: [0.62, 0.62] },
  shark_deep: { cuts: [0.43, 0.21], pivots: [0.56, 0.526] },
  shark_great: { cuts: [0.42, 0.2], pivots: [0.6, 0.623] },
  shark_hammer: { cuts: [0.45, 0.22], pivots: [0.46, 0.472] },
  shark_reef: { cuts: [0.45, 0.2], pivots: [0.48, 0.498] },
  shark_small: { cuts: [0.45, 0.2], pivots: [0.556, 0.546] },
};
