import type { SpriteName } from '../render/spriteAssets';
import type { ChestKind, SharkKind } from './types';

export interface ChestInfo {
  name: string;
  sprite: SpriteName;
  min: number;
  max: number;
  weight: number;
  glow: string | null;
  width: number;
}

export const CHESTS: Record<ChestKind, ChestInfo> = {
  common: { name: 'Obyčejná truhlice', sprite: 'chest_common', min: 60, max: 95, weight: 1, glow: null, width: 46 },
  uncommon: { name: 'Kovaná truhlice', sprite: 'chest_uncommon', min: 120, max: 175, weight: 1, glow: '#65C83C', width: 48 },
  rare: { name: 'Zlatá truhlice', sprite: 'chest_rare', min: 260, max: 360, weight: 1.3, glow: '#20D4E8', width: 52 },
  epic: { name: 'Vzácná truhlice', sprite: 'chest_epic', min: 550, max: 760, weight: 1.6, glow: '#AD65F5', width: 54 },
  legendary: { name: 'Starověká truhlice', sprite: 'chest_legendary', min: 1200, max: 1650, weight: 2, glow: '#FFBF32', width: 60 },
  mystery: { name: 'Mystery truhlice', sprite: 'chest_mystery', min: 40, max: 1100, weight: 1.2, glow: '#20D4E8', width: 50 },
};

export const CHEST_WEIGHTS: Partial<Record<ChestKind, number>>[] = [
  { common: 85, uncommon: 15 },
  { common: 55, uncommon: 30, rare: 10, mystery: 5 },
  { common: 30, uncommon: 35, rare: 22, mystery: 13 },
  { uncommon: 30, rare: 35, epic: 20, mystery: 15 },
  { rare: 35, epic: 35, legendary: 15, mystery: 15 },
  { rare: 20, epic: 40, legendary: 30, mystery: 10 },
];

export interface SharkInfo {
  name: string;
  sprite: SpriteName;
  width: number;
  patrol: number;
  chase: number;
  vision: number;
  damage: number;
  chaseTime: number;
}

export const SHARKS: Record<SharkKind, SharkInfo> = {
  small: { name: 'Malý žralok', sprite: 'shark_small', width: 86, patrol: 75, chase: 150, vision: 170, damage: 12, chaseTime: 3.5 },
  reef: { name: 'Útesový žralok', sprite: 'shark_reef', width: 120, patrol: 58, chase: 128, vision: 210, damage: 18, chaseTime: 4 },
  hammer: { name: 'Kladivoun', sprite: 'shark_hammer', width: 140, patrol: 62, chase: 140, vision: 240, damage: 22, chaseTime: 4.5 },
  great: { name: 'Velký bílý žralok', sprite: 'shark_great', width: 190, patrol: 50, chase: 138, vision: 270, damage: 32, chaseTime: 5 },
  deep: { name: 'Hlubinný žralok', sprite: 'shark_deep', width: 160, patrol: 48, chase: 155, vision: 230, damage: 28, chaseTime: 5 },
};

export const SHARK_KINDS_BY_REGION: Partial<Record<SharkKind, number>>[] = [
  {},
  { small: 70, reef: 30 },
  { small: 30, reef: 45, hammer: 25 },
  { reef: 35, hammer: 40, great: 25 },
  { hammer: 25, great: 35, deep: 40 },
  { great: 40, deep: 60 },
];

export const SHARK_HUNTER_CHANCE = [0, 0.3, 0.5, 0.6, 0.7, 0.8];
export const CHEST_CHANCE = [0.6, 0.62, 0.62, 0.66, 0.7, 0.75];

export const HAZARD_DAMAGE = { jelly: 9, mine: 34, urchin: 7 };
