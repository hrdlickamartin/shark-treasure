import type { SharkKind } from './types';

export interface Landmark {
  decor: string;
  chance: number;
}

export interface Region {
  id: number;
  name: string;
  subtitle: string;
  start: number;
  baseDepth: number;
  amplitude: number;
  sand: string;
  sandDark: string;
  sandEdge: string;
  tier: number;
  lootScale?: number;
  decor: string[];
  front?: string[];
  landmarks: Landmark[];
  caves: boolean;
  caveChance?: number;
  relicBoost?: number;
  whales?: number;
  sharks?: Partial<Record<SharkKind, number>>;
}

export const DEFAULT_FRONT = ['seaweed', 'coral_pink', 'coral_orange', 'rock_small'];


export function regionIndexAt(regions: Region[], x: number): number {
  const d = Math.abs(x);
  let index = 0;
  for (let i = 0; i < regions.length; i++) if (d >= regions[i].start) index = i;
  return index;
}

export const regionAt = (regions: Region[], x: number): Region => regions[regionIndexAt(regions, x)];

export const regionLimit = (regions: Region[], unlocked: number): number => regions[unlocked + 1]?.start ?? Number.POSITIVE_INFINITY;
