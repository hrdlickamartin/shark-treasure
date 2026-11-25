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
  jeweled: { name: 'Drahokamová truhlice', sprite: 'chest_jeweled', min: 900, max: 1300, weight: 1.8, glow: '#FF6FD8', width: 56 },
  mystery: { name: 'Mystery truhlice', sprite: 'chest_mystery', min: 40, max: 1100, weight: 1.2, glow: '#20D4E8', width: 50 },
  heavy: { name: 'Těžká truhla', sprite: 'chest_heavy', min: 700, max: 1100, weight: 5, glow: '#FF9A3C', width: 72 },
};

export const CHEST_WEIGHTS: Partial<Record<ChestKind, number>>[] = [
  { common: 85, uncommon: 15 },
  { common: 55, uncommon: 30, rare: 10, mystery: 5 },
  { common: 30, uncommon: 35, rare: 22, mystery: 13 },
  { uncommon: 30, rare: 35, epic: 20, mystery: 15 },
  { rare: 35, epic: 35, legendary: 15, mystery: 15, jeweled: 8 },
  { rare: 20, epic: 40, legendary: 30, mystery: 10, jeweled: 12 },
  { epic: 40, legendary: 35, mystery: 25, jeweled: 15 },
  { epic: 30, legendary: 55, mystery: 15, jeweled: 18 },
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
  boss?: boolean;
  hp?: number;
}

export const SHARKS: Record<SharkKind, SharkInfo> = {
  small: { name: 'Malý žralok', sprite: 'shark_small', width: 86, patrol: 75, chase: 150, vision: 170, damage: 12, chaseTime: 3.5 },
  reef: { name: 'Útesový žralok', sprite: 'shark_reef', width: 120, patrol: 58, chase: 128, vision: 210, damage: 18, chaseTime: 4 },
  hammer: { name: 'Kladivoun', sprite: 'shark_hammer', width: 140, patrol: 62, chase: 140, vision: 240, damage: 22, chaseTime: 4.5 },
  great: { name: 'Velký bílý žralok', sprite: 'shark_great', width: 190, patrol: 50, chase: 138, vision: 270, damage: 32, chaseTime: 5 },
  deep: { name: 'Hlubinný žralok', sprite: 'shark_deep', width: 160, patrol: 48, chase: 155, vision: 230, damage: 28, chaseTime: 5 },
  mega: { name: 'Megalodon', sprite: 'megalodon', width: 320, patrol: 55, chase: 120, vision: 380, damage: 42, chaseTime: 99, boss: true, hp: 3 },
  orca: { name: 'Kosatka', sprite: 'orca', width: 170, patrol: 70, chase: 165, vision: 200, damage: 26, chaseTime: 4.5 },
  leviathan: { name: 'Leviatan', sprite: 'leviathan', width: 460, patrol: 50, chase: 125, vision: 360, damage: 40, chaseTime: 99, boss: true, hp: 4 },
  abyssal: { name: 'Tvor z hlubin', sprite: 'abyssal_creature', width: 300, patrol: 45, chase: 140, vision: 300, damage: 45, chaseTime: 99, boss: true, hp: 4 },
  maelstrom: { name: 'Vládce proudů', sprite: 'maelstrom_eel', width: 520, patrol: 150, chase: 150, vision: 420, damage: 24, chaseTime: 99, boss: true, hp: 3 },
  hollow: { name: 'Dutá ulita', sprite: 'hollow_shell', width: 340, patrol: 40, chase: 70, vision: 300, damage: 22, chaseTime: 99, boss: true, hp: 4 },
};

export const SHARK_KINDS_BY_REGION: Partial<Record<SharkKind, number>>[] = [
  {},
  { small: 70, reef: 30 },
  { small: 30, reef: 45, hammer: 25 },
  { reef: 35, hammer: 40, great: 25 },
  { hammer: 25, great: 35, deep: 40 },
  { great: 40, deep: 60 },
  { great: 30, deep: 70 },
  { great: 40, deep: 60 },
];

export const SHARK_HUNTER_CHANCE = [0, 0.3, 0.4, 0.55, 0.7, 0.8, 0.85, 0.9];
export const SHARKS_PER_CHUNK = [0, 0.65, 0.9, 1.2, 1.57, 1.65, 1.73, 1.81];
export const CHEST_CHANCE = [0.6, 0.62, 0.62, 0.66, 0.7, 0.75, 0.8, 0.85];

export const HAZARD_DAMAGE = { jelly: 9, mine: 34, urchin: 7, eel: 14, debris: 12, crab: 8, angler: 20, ray: 15, toxic: 7, spikes: 12, barracuda: 9, siphon: 8, pistol: 5, shadow: 14, collapse: 12 };

export const HEAVY_SLOTS = 2;

export const chestSlots = (kind: ChestKind) => (kind === 'heavy' ? HEAVY_SLOTS : 1);
