import type { SpriteName } from './spriteAssets';

export interface RigDef {
  cuts: number[];
  pivots: number[];
}

export const RIGS: Partial<Record<SpriteName, RigDef>> = {
  abyssal_creature: { cuts: [0.5, 0.25], pivots: [0.5, 0.5] },
  diver_carry: { cuts: [0.4, 0.22], pivots: [0.66, 0.66] },
  diver_carry_coral: { cuts: [0.4, 0.22], pivots: [0.66, 0.66] },
  diver_carry_reef: { cuts: [0.4, 0.22], pivots: [0.66, 0.66] },
  diver_carry_royal: { cuts: [0.4, 0.22], pivots: [0.66, 0.66] },
  diver_swim1: { cuts: [0.37, 0.22], pivots: [0.62, 0.62] },
  diver_swim1_coral: { cuts: [0.37, 0.22], pivots: [0.62, 0.62] },
  diver_swim1_reef: { cuts: [0.37, 0.22], pivots: [0.62, 0.62] },
  diver_swim1_royal: { cuts: [0.37, 0.22], pivots: [0.62, 0.62] },
  eel: { cuts: [0.58, 0.3], pivots: [0.5, 0.7] },
  leviathan: { cuts: [0.68, 0.52, 0.36, 0.2], pivots: [0.8, 0.55, 0.76, 0.63] },
  maelstrom_eel: { cuts: [0.66, 0.48, 0.3, 0.14], pivots: [0.5, 0.5, 0.5, 0.5] },
  megalodon: { cuts: [0.42, 0.18], pivots: [0.5, 0.48] },
  orca: { cuts: [0.42, 0.21], pivots: [0.6, 0.58] },
  rift_shadow: { cuts: [0.45, 0.2], pivots: [0.5, 0.5] },
  shark_deep: { cuts: [0.43, 0.21], pivots: [0.56, 0.526] },
  shark_great: { cuts: [0.42, 0.2], pivots: [0.6, 0.623] },
  shark_hammer: { cuts: [0.45, 0.22], pivots: [0.46, 0.472] },
  shark_reef: { cuts: [0.45, 0.2], pivots: [0.48, 0.498] },
  shark_small: { cuts: [0.45, 0.2], pivots: [0.556, 0.546] },
};
