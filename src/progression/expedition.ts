import type { SpriteName } from '../render/spriteAssets';

export type PerkId = 'capital' | 'trader' | 'lungs' | 'shipwright' | 'veteran';

export type PerkLevels = Partial<Record<PerkId, number>>;

export interface PerkDef {
  id: PerkId;
  name: string;
  description: string;
  icon: SpriteName;
  costs: number[];
  effect: (level: number) => string;
}

export const PERKS: PerkDef[] = [
  { id: 'capital', name: 'Startovní kapitál', description: 'Peníze do začátku každé výpravy', icon: 'coin', costs: [2, 3, 5, 8, 12], effect: (l) => `${(l * 2000).toLocaleString('cs-CZ')} $` },
  { id: 'trader', name: 'Obchodník', description: 'Truhlice mají vyšší hodnotu', icon: 'icon_trophy', costs: [3, 5, 8, 12, 18], effect: (l) => `+${l * 10} % k pokladům` },
  { id: 'lungs', name: 'Silné plíce', description: 'Víc kyslíku v každé nádrži', icon: 'icon_tank', costs: [2, 4, 6, 9, 13], effect: (l) => `+${l * 8} % kyslíku` },
  { id: 'shipwright', name: 'Loďař', description: 'Výprava začíná s lepší lodí', icon: 'icon_engine', costs: [6, 12], effect: (l) => `loď úroveň ${l}` },
  { id: 'veteran', name: 'Veterán', description: 'Vybavení začíná na 1. úrovni', icon: 'icon_suit', costs: [10], effect: (l) => (l ? 'aktivní' : 'neaktivní') },
];

export function perkLevel(perks: PerkLevels, id: PerkId): number {
  return perks[id] ?? 0;
}

export function perkCost(def: PerkDef, level: number): number | null {
  return def.costs[level] ?? null;
}

export function perkBonus(perks: PerkLevels) {
  return { oxygen: perkLevel(perks, 'lungs') * 0.08, loot: perkLevel(perks, 'trader') * 0.1 };
}

const SCALE_CAP = 10;

export function expeditionScale(expedition: number) {
  const e = Math.min(SCALE_CAP, Math.max(0, expedition));
  return { danger: 1 + e * 0.15, sharkSpeed: 1 + e * 0.06, loot: e * 0.3, missions: 1 + e * 0.5 };
}

export const SHAFT_PEARL_STEP = 100;

export function shaftPearls(previousBest: number, depthM: number): number {
  return Math.max(0, Math.floor(depthM / SHAFT_PEARL_STEP) - Math.floor(previousBest / SHAFT_PEARL_STEP));
}

export function pearlsFor(earned: number, expedition: number): number {
  return 4 + Math.floor(Math.sqrt(Math.max(0, earned) / 2000)) + expedition;
}
