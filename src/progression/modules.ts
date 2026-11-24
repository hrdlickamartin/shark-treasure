import type { MaterialCounts } from '../game/gear';
import type { SpriteName } from '../render/spriteAssets';
import type { FactionId } from './factions';

export type ModuleSlot = 'bow' | 'deck' | 'stern' | 'mast' | 'hold' | 'keel';

export type ModuleId = 'crane' | 'bell' | 'aquarium' | 'lab' | 'sail' | 'radio' | 'chamber' | 'trophy';

export interface ModuleDef {
  id: ModuleId;
  slot: ModuleSlot;
  name: string;
  effect: string;
  sprite: SpriteName;
  money: number;
  cost: MaterialCounts;
  faction?: FactionId;
}

export const SLOTS: { id: ModuleSlot; name: string; x: number; y: number; width: number }[] = [
  { id: 'deck', name: 'Paluba', x: 0.02, y: -0.5, width: 0.22 },
  { id: 'stern', name: 'Záď', x: -0.36, y: -0.52, width: 0.22 },
  { id: 'mast', name: 'Stěžeň', x: -0.12, y: -0.95, width: 0.2 },
  { id: 'hold', name: 'Podpalubí', x: 0.05, y: -0.12, width: 0.2 },
  { id: 'bow', name: 'Příď', x: 0.34, y: -0.62, width: 0.16 },
  { id: 'keel', name: 'Kýl', x: -0.1, y: 0.18, width: 0.13 },
];

export const MODULES: Record<ModuleId, ModuleDef> = {
  crane: { id: 'crane', slot: 'stern', name: 'Jeřáb', effect: 'Vytáhne těžkou truhlu, když s ní doplaveš pod loď', sprite: 'mod_crane', money: 6000, cost: { scrap: 8, rope: 6 }, faction: 'guild' },
  bell: { id: 'bell', slot: 'keel', name: 'Potápěčský zvon', effect: 'Kyslíkový checkpoint 25 m pod lodí, jednou za ponor doplní 50 %', sprite: 'mod_bell', money: 9000, cost: { scrap: 10, ice: 4 } },
  aquarium: { id: 'aquarium', slot: 'hold', name: 'Akvárium', effect: 'Tvorové chycení sítí se vystaví, +5 % XP z fotek', sprite: 'mod_aquarium', money: 7000, cost: { nacre: 6, biogel: 4 }, faction: 'institute' },
  lab: { id: 'lab', slot: 'deck', name: 'Laboratoř', effect: 'Výzkum o 20 % levnější', sprite: 'mod_lab', money: 8000, cost: { alloy: 4, biogel: 4 }, faction: 'institute' },
  sail: { id: 'sail', slot: 'mast', name: 'Bouřková plachta', effect: 'V bouři +30 % rychlost lodi, víc událostí na moři', sprite: 'mod_sail', money: 4000, cost: { rope: 8 }, faction: 'brotherhood' },
  radio: { id: 'radio', slot: 'bow', name: 'Rádiová věž', effect: 'Pip má o 25 % větší dosah, rádio hlásí trhliny', sprite: 'mod_radio', money: 5000, cost: { scrap: 6, nacre: 2 } },
  chamber: { id: 'chamber', slot: 'hold', name: 'Dekompresní komora', effect: '−8 % poškození a +15 % rychlost výstupu', sprite: 'mod_chamber', money: 7500, cost: { obsidian: 6 }, faction: 'tidewatch' },
  trophy: { id: 'trophy', slot: 'deck', name: 'Trofejní síň', effect: '+2 % za truhlice za každou vystavenou relikvii', sprite: 'mod_trophy', money: 3000, cost: { nacre: 4 } },
};

export const MODULE_IDS = Object.keys(MODULES) as ModuleId[];

export type BoatModules = Partial<Record<ModuleSlot, ModuleId>>;

export function slotCount(boatLevel: number): number {
  return 2 + Math.min(4, boatLevel);
}

export function openSlots(boatLevel: number): ModuleSlot[] {
  return SLOTS.slice(0, slotCount(boatLevel)).map((s) => s.id);
}

export function equipped(modules: BoatModules, id: ModuleId): boolean {
  return modules[MODULES[id].slot] === id;
}

