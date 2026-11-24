import type { RelicId } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';

export interface RelicBonus {
  oxygen?: number;
  speed?: number;
  armor?: number;
  sonar?: number;
  money?: number;
  magnet?: number;
  ascent?: number;
  balloons?: number;
}

export interface RelicDef {
  id: RelicId;
  name: string;
  description: string;
  sprite: SpriteName;
  bonus: RelicBonus;
}

export const RELICS: RelicDef[] = [
  { id: 'compass', name: 'Kompas mořeplavce', description: '+30 % dosah sonaru', sprite: 'relic_compass', bonus: { sonar: 0.3 } },
  { id: 'pearl', name: 'Perla hlubin', description: '+8 % kyslíku', sprite: 'relic_pearl', bonus: { oxygen: 0.08 } },
  { id: 'trident', name: 'Trojzubec', description: '+6 % rychlost', sprite: 'relic_trident', bonus: { speed: 0.06 } },
  { id: 'mask', name: 'Nefritová maska', description: '-8 % poškození', sprite: 'relic_mask', bonus: { armor: 0.08 } },
  { id: 'coin', name: 'Pirátský dublon', description: '+10 % za truhlice', sprite: 'relic_coin', bonus: { money: 0.1 } },
  { id: 'horn', name: 'Lastura', description: 'Mince přitahuješ z dálky', sprite: 'relic_horn', bonus: { magnet: 40 } },
  { id: 'idol', name: 'Žraločí idol', description: '+15 % rychlejší výstup', sprite: 'relic_idol', bonus: { ascent: 0.15 } },
  { id: 'map', name: 'Pradávná mapa', description: '+1 zvedací balón', sprite: 'relic_map', bonus: { balloons: 1 } },
];

export const SET_BONUS = 0.2;

export function relicBonus(owned: RelicId[]) {
  const total = { oxygen: 0, speed: 0, armor: 0, sonar: 0, money: 0, magnet: 0, ascent: 0, balloons: 0 };
  for (const relic of RELICS) {
    if (!owned.includes(relic.id)) continue;
    for (const [key, value] of Object.entries(relic.bonus) as [keyof RelicBonus, number][]) total[key] += value;
  }
  if (RELICS.every((r) => owned.includes(r.id))) total.money += SET_BONUS;
  return total;
}

export const RELIC_CHANCE: Record<string, number> = { epic: 0.25, legendary: 0.6, mystery: 0.3, jeweled: 0.35 };
