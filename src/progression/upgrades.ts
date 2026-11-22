import { regionLimit } from '../game/regions';
import type { Stats } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';

export type UpgradeId = 'tank' | 'fins' | 'suit' | 'capacity' | 'sonar' | 'light' | 'ascent' | 'boat';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: SpriteName;
  max: number;
  baseCost: number;
  growth: number;
  effect: (level: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'tank', name: 'Kyslíková nádrž', description: 'Delší ponory', icon: 'icon_tank', max: 6, baseCost: 150, growth: 1.75, effect: (l) => `${oxygenFor(l)} s kyslíku` },
  { id: 'fins', name: 'Ploutve', description: 'Vyšší rychlost', icon: 'icon_fins', max: 5, baseCost: 180, growth: 1.8, effect: (l) => `rychlost ${Math.round((speedFor(l) / speedFor(0)) * 100)} %` },
  { id: 'suit', name: 'Neopren', description: 'Odolnost vůči útokům', icon: 'icon_suit', max: 5, baseCost: 220, growth: 1.8, effect: (l) => `-${Math.round(armorFor(l) * 100)} % poškození` },
  { id: 'capacity', name: 'Síť na poklady', description: 'Uneseš víc truhlic', icon: 'icon_net', max: 3, baseCost: 400, growth: 2.2, effect: (l) => `${2 + l} truhlice` },
  { id: 'sonar', name: 'Sonar', description: 'Ukazuje poklady poblíž', icon: 'icon_sonar', max: 3, baseCost: 500, growth: 2, effect: (l) => (l ? `dosah ${Math.round(sonarFor(l) / 10)} m` : 'nemáš') },
  { id: 'light', name: 'Světlo', description: 'Vidíš v hlubinách', icon: 'icon_light', max: 3, baseCost: 600, growth: 2, effect: (l) => (l ? `úroveň ${l}` : 'nemáš') },
  { id: 'ascent', name: 'Vztlaková vesta', description: 'Rychlejší návrat na hladinu', icon: 'icon_vest', max: 3, baseCost: 350, growth: 1.9, effect: (l) => `+${Math.round(l * 20)} % výstup` },
  { id: 'boat', name: 'Lepší loď', description: 'Odemyká další oblasti', icon: 'icon_engine', max: 5, baseCost: 800, growth: 2.1, effect: (l) => `${l + 1}/6 oblastí` },
];

export type UpgradeLevels = Record<UpgradeId, number>;

export const EMPTY_LEVELS: UpgradeLevels = { tank: 0, fins: 0, suit: 0, capacity: 0, sonar: 0, light: 0, ascent: 0, boat: 0 };

const oxygenFor = (level: number) => 45 + level * 14;
const speedFor = (level: number) => 128 + level * 16;
const armorFor = (level: number) => Math.min(0.6, level * 0.11);
const sonarFor = (level: number) => (level ? 520 + (level - 1) * 280 : 0);

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round((def.baseCost * Math.pow(def.growth, level)) / 10) * 10;
}

export function statsFor(levels: UpgradeLevels): Stats {
  return {
    oxygenMax: oxygenFor(levels.tank),
    speed: speedFor(levels.fins),
    armor: armorFor(levels.suit),
    capacity: 2 + levels.capacity,
    sonarRange: sonarFor(levels.sonar),
    light: levels.light,
    ascent: 1 + levels.ascent * 0.2,
    boatSpeed: 170 + levels.boat * 30,
    boatLimit: regionLimit(levels.boat),
    boatLevel: levels.boat,
  };
}
