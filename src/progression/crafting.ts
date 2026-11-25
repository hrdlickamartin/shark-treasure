import { addCounts, KIT, type KitCounts, type KitId, type MaterialCounts } from '../game/gear';
import type { Supplies } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';
import type { FactionId } from './factions';

export type ModSlot = 'tank' | 'fins' | 'suit' | 'harpoon' | 'drone';

export type ModId = 'reserve' | 'cooler' | 'trader' | 'quickstart' | 'racer' | 'deflect' | 'seal' | 'riftsuit' | 'net' | 'longshot' | 'magnet' | 'lens';

export interface ModDef {
  id: ModId;
  slot: ModSlot;
  name: string;
  effect: string;
  icon: SpriteName;
}

export const MOD_SLOTS: { id: ModSlot; name: string }[] = [
  { id: 'tank', name: 'Nádrž' },
  { id: 'fins', name: 'Ploutve' },
  { id: 'suit', name: 'Oblek' },
  { id: 'harpoon', name: 'Harpuna' },
  { id: 'drone', name: 'Pip' },
];

export const MODS: Record<ModId, ModDef> = {
  reserve: { id: 'reserve', slot: 'tank', name: 'Rezervní ventil', effect: 'Při 0 % kyslíku jednou přidá 8 s', icon: 'icon_tank' },
  cooler: { id: 'cooler', slot: 'tank', name: 'Úsporný regulátor', effect: '−15 % spotřeby kyslíku', icon: 'icon_o2' },
  trader: { id: 'trader', slot: 'tank', name: 'Obchodní nádrž', effect: '+8 % za truhlice', icon: 'icon_trophy' },
  quickstart: { id: 'quickstart', slot: 'fins', name: 'Rychlý start', effect: '2 s po změně směru +30 % rychlost', icon: 'icon_fins' },
  racer: { id: 'racer', slot: 'fins', name: 'Závodní ploutve', effect: 'V proudu +12 % rychlost', icon: 'icon_fins' },
  deflect: { id: 'deflect', slot: 'suit', name: 'Odrazová vrstva', effect: 'První zásah v ponoru −50 % poškození', icon: 'icon_suit' },
  seal: { id: 'seal', slot: 'suit', name: 'Těsnicí vrstva', effect: '+20 m bezpečné hloubky, −15 % ztráty teploty', icon: 'icon_pressure' },
  riftsuit: { id: 'riftsuit', slot: 'suit', name: 'Trhlinový oblek', effect: 'Trhlinové stíny zraňují o 50 % méně', icon: 'icon_suit' },
  net: { id: 'net', slot: 'harpoon', name: 'Síťová střela', effect: 'Malého tvora harpuna nezabije, ale chytí (foto 3★)', icon: 'icon_net' },
  longshot: { id: 'longshot', slot: 'harpoon', name: 'Dlouhá hlaveň', effect: '+40 % dosah harpuny', icon: 'icon_harpoon' },
  magnet: { id: 'magnet', slot: 'drone', name: 'Lesklý magnet pro Pipa', effect: 'Pip donese i atlantské úlomky', icon: 'icon_magnet' },
  lens: { id: 'lens', slot: 'drone', name: 'Badatelská optika', effect: 'Pip skenuje tvory na 2★', icon: 'icon_camera' },
};

export type RecipeOutput = { kind: 'kit'; id: KitId; amount: number } | { kind: 'supply'; id: keyof Supplies; amount: number } | { kind: 'mod'; id: ModId };

export interface RecipeDef {
  id: string;
  output: RecipeOutput;
  cost: MaterialCounts;
  money: number;
  unlock?: { faction: FactionId; tier: number };
  expansion?: boolean;
}

export const RECIPES: RecipeDef[] = [
  { id: 'flare', output: { kind: 'kit', id: 'flare', amount: 1 }, cost: { biogel: 2 }, money: 0 },
  { id: 'bait', output: { kind: 'kit', id: 'bait', amount: 1 }, cost: { scrap: 1, nacre: 1 }, money: 0 },
  { id: 'canister', output: { kind: 'kit', id: 'canister', amount: 1 }, cost: { scrap: 2, rope: 1 }, money: 0 },
  { id: 'anchor', output: { kind: 'kit', id: 'anchor', amount: 1 }, cost: { scrap: 2, rope: 2 }, money: 0 },
  { id: 'buoy', output: { kind: 'kit', id: 'buoy', amount: 1 }, cost: { scrap: 1, nacre: 1 }, money: 0 },
  { id: 'medkit', output: { kind: 'supply', id: 'medkit', amount: 1 }, cost: { biogel: 1, rope: 1 }, money: 150 },
  { id: 'balloon', output: { kind: 'supply', id: 'balloon', amount: 1 }, cost: { rope: 3 }, money: 100 },
  { id: 'reserve', output: { kind: 'mod', id: 'reserve' }, cost: { scrap: 4, ice: 2 }, money: 1500 },
  { id: 'cooler', output: { kind: 'mod', id: 'cooler' }, cost: { scrap: 3, ice: 3, alloy: 1 }, money: 3000 },
  { id: 'quickstart', output: { kind: 'mod', id: 'quickstart' }, cost: { rope: 3, nacre: 2 }, money: 1500 },
  { id: 'deflect', output: { kind: 'mod', id: 'deflect' }, cost: { obsidian: 3, biogel: 2 }, money: 2500 },
  { id: 'seal', output: { kind: 'mod', id: 'seal' }, cost: { obsidian: 2, ice: 2, scrap: 2 }, money: 2500 },
  { id: 'net', output: { kind: 'mod', id: 'net' }, cost: { rope: 3, alloy: 1 }, money: 2000 },
  { id: 'longshot', output: { kind: 'mod', id: 'longshot' }, cost: { scrap: 4, obsidian: 1 }, money: 2000 },
  { id: 'magnet', output: { kind: 'mod', id: 'magnet' }, cost: { nacre: 2, alloy: 1 }, money: 2500, expansion: true },
  { id: 'tow', output: { kind: 'kit', id: 'tow', amount: 1 }, cost: { rope: 3, scrap: 1 }, money: 0, unlock: { faction: 'guild', tier: 1 }, expansion: true },
  { id: 'trader', output: { kind: 'mod', id: 'trader' }, cost: { alloy: 2, nacre: 4 }, money: 6000, unlock: { faction: 'guild', tier: 4 } },
  { id: 'antidote', output: { kind: 'kit', id: 'antidote', amount: 1 }, cost: { biogel: 2, nacre: 1 }, money: 0, unlock: { faction: 'institute', tier: 1 } },
  { id: 'lens', output: { kind: 'mod', id: 'lens' }, cost: { alloy: 2, ice: 2 }, money: 6000, unlock: { faction: 'institute', tier: 4 } },
  { id: 'sprint', output: { kind: 'kit', id: 'sprint', amount: 1 }, cost: { scrap: 2, biogel: 1 }, money: 0, unlock: { faction: 'brotherhood', tier: 1 } },
  { id: 'racer', output: { kind: 'mod', id: 'racer' }, cost: { rope: 4, obsidian: 2 }, money: 6000, unlock: { faction: 'brotherhood', tier: 4 } },
  { id: 'riftsuit', output: { kind: 'mod', id: 'riftsuit' }, cost: { alloy: 2, obsidian: 2 }, money: 4000, unlock: { faction: 'tidewatch', tier: 1 }, expansion: true },
];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);

export function outputName(output: RecipeOutput): string {
  if (output.kind === 'kit') return KIT[output.id].name;
  if (output.kind === 'mod') return MODS[output.id].name;
  return output.id === 'medkit' ? 'Lékárnička' : output.id === 'balloon' ? 'Zvedací balón' : 'Harpuna';
}

export function outputIcon(output: RecipeOutput): SpriteName {
  if (output.kind === 'kit') return KIT[output.id].icon;
  if (output.kind === 'mod') return MODS[output.id].icon;
  return output.id === 'medkit' ? 'icon_medkit' : output.id === 'balloon' ? 'balloon' : 'icon_harpoon';
}

export function affordable(have: MaterialCounts, cost: MaterialCounts): boolean {
  return (Object.entries(cost) as [keyof MaterialCounts, number][]).every(([id, n]) => (have[id] ?? 0) >= n);
}

export function spendMaterials(have: MaterialCounts, cost: MaterialCounts): MaterialCounts {
  return addCounts(have, cost, -1);
}

export function addKit(kit: KitCounts, id: KitId, amount: number): KitCounts {
  return addCounts(kit, { [id]: amount } as KitCounts);
}
