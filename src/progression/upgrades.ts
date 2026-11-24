import { CHALLENGES } from '../game/modifiers';
import { DEPTH_SCALE } from '../game/terrain';
import { MEDKIT_HEAL, photoRange, scooterFor, submarineDepthM } from '../game/systems/extras';
import type { ChallengeId, RelicId, Stats } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';
import { expeditionScale, perkBonus, type PerkLevels } from './expedition';
import { relicBonus } from './relics';
import { researchBonus } from './research';

export type UpgradeId =
  | 'tank'
  | 'fins'
  | 'suit'
  | 'capacity'
  | 'sonar'
  | 'light'
  | 'ascent'
  | 'balloon'
  | 'repellent'
  | 'magnet'
  | 'insurance'
  | 'medkit'
  | 'scooter'
  | 'harpoon'
  | 'submarine'
  | 'thermal'
  | 'pressure'
  | 'cutter'
  | 'camera'
  | 'boat';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: SpriteName;
  max: number;
  extra: number;
  unlockAt?: number;
  baseCost: number;
  growth: number;
  effect: (level: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'tank', name: 'Kyslíková nádrž', description: 'Delší ponory', icon: 'icon_tank', max: 6, extra: 3, baseCost: 150, growth: 1.75, effect: (l) => `${oxygenFor(l)} s kyslíku` },
  { id: 'fins', name: 'Ploutve', description: 'Vyšší rychlost', icon: 'icon_fins', max: 5, extra: 2, baseCost: 180, growth: 1.8, effect: (l) => `rychlost ${Math.round((speedFor(l) / speedFor(0)) * 100)} %` },
  { id: 'suit', name: 'Neopren', description: 'Odolnost vůči útokům', icon: 'icon_suit', max: 5, extra: 1, baseCost: 220, growth: 1.8, effect: (l) => `-${Math.round(armorFor(l) * 100)} % poškození` },
  { id: 'capacity', name: 'Síť na poklady', description: 'Uneseš víc truhlic', icon: 'icon_net', max: 3, extra: 1, baseCost: 400, growth: 2.2, effect: (l) => `${2 + l} truhlice` },
  { id: 'sonar', name: 'Sonar', description: 'Ukazuje poklady poblíž', icon: 'icon_sonar', max: 3, extra: 1, baseCost: 500, growth: 2, effect: (l) => (l ? `dosah ${Math.round(sonarFor(l) / 10)} m` : 'nemáš') },
  { id: 'light', name: 'Světlo', description: 'Vidíš v hlubinách', icon: 'icon_light', max: 3, extra: 1, baseCost: 600, growth: 2, effect: (l) => (l ? `úroveň ${l}` : 'nemáš') },
  { id: 'ascent', name: 'Vztlaková vesta', description: 'Rychlejší návrat na hladinu', icon: 'icon_vest', max: 3, extra: 2, baseCost: 350, growth: 1.9, effect: (l) => `+${Math.round(l * 20)} % výstup` },
  { id: 'balloon', name: 'Zvedací balón', description: 'Pošle truhlici k hladině', icon: 'balloon', max: 3, extra: 2, baseCost: 450, growth: 1.9, effect: (l) => (l ? `${l}× za ponor` : 'nemáš') },
  { id: 'repellent', name: 'Plašič žraloků', description: 'Odežene žraloky v nouzi', icon: 'icon_repellent', max: 3, extra: 2, baseCost: 380, growth: 1.9, effect: (l) => (l ? `${l}× za ponor` : 'nemáš') },
  { id: 'magnet', name: 'Magnet na mince', description: 'Přitahuje mince z dálky', icon: 'icon_magnet', max: 3, extra: 2, baseCost: 320, growth: 1.9, effect: (l) => (l ? `dosah ${Math.round((30 + magnetFor(l) * 2.5) / 10)} m` : 'nemáš') },
  { id: 'insurance', name: 'Pojištění nákladu', description: 'Při nezdaru vrátí část pokladu', icon: 'icon_insurance', max: 3, extra: 2, baseCost: 600, growth: 2, effect: (l) => (l ? `vrátí ${Math.round(insuranceFor(l) * 100)} %` : 'nemáš') },
  { id: 'medkit', name: 'Lékárnička', description: 'Doplní zdraví během ponoru', icon: 'icon_medkit', max: 3, extra: 2, unlockAt: 1, baseCost: 900, growth: 1.9, effect: (l) => (l ? `${l}× za ponor, +${MEDKIT_HEAL} zdraví` : 'nemáš') },
  { id: 'scooter', name: 'Podvodní skútr', description: 'Krátký rychlý výpad', icon: 'icon_scooter', max: 3, extra: 2, unlockAt: 1, baseCost: 1100, growth: 1.9, effect: (l) => (l ? `${scooterFor(l).time.toLocaleString('cs-CZ')} s, nabití ${scooterFor(l).cooldown} s` : 'nemáš') },
  { id: 'harpoon', name: 'Harpuna', description: 'Střílí na žraloky a nebezpečné tvory před tebou', icon: 'icon_harpoon', max: 3, extra: 2, baseCost: 700, growth: 1.9, effect: (l) => (l ? `${l}× za ponor` : 'nemáš') },
  { id: 'submarine', name: 'Mini ponorka', description: 'Kotví pod lodí a doplňuje kyslík', icon: 'icon_submarine', max: 3, extra: 2, unlockAt: 2, baseCost: 2500, growth: 1.8, effect: (l) => (l ? `stanice v ${submarineDepthM(l)} m` : 'nemáš') },
  { id: 'pressure', name: 'Tlakový oblek', description: 'Bezpečný ponor do větších hloubek', icon: 'icon_pressure', max: 5, extra: 2, baseCost: 500, growth: 1.85, effect: (l) => `bezpečně do ${safeDepthFor(l)} m` },
  { id: 'thermal', name: 'Termooblek', description: 'Chrání před chladem i žárem', icon: 'icon_thermal', max: 3, extra: 2, baseCost: 700, growth: 1.9, effect: (l) => (l ? `−${Math.round((1 - thermalFor(l)) * 100)} % ztráty teploty` : 'nemáš') },
  { id: 'cutter', name: 'Řezák', description: 'Otevře zapečetěné truhly a vraky', icon: 'icon_cutter', max: 2, extra: 1, baseCost: 1400, growth: 2, effect: (l) => (l ? `řez za ${cutTime(l).toLocaleString('cs-CZ')} s` : 'nemáš') },
  { id: 'camera', name: 'Fotoaparát', description: 'Lepší objektiv: větší dosah a kvalitnější fotky', icon: 'icon_camera', max: 3, extra: 1, baseCost: 350, growth: 1.9, effect: (l) => `dosah ${Math.round(cameraRange(l + 1) / 10)} m` },
  { id: 'boat', name: 'Lodní motor', description: 'Rychlejší plavba po oceánu', icon: 'icon_engine', max: 5, extra: 2, baseCost: 800, growth: 2.1, effect: (l) => `rychlost ${Math.round(((170 + l * 30) / 170) * 100)} %` },
];

export type UpgradeLevels = Record<UpgradeId, number>;

export const EMPTY_LEVELS: UpgradeLevels = {
  tank: 0,
  fins: 0,
  suit: 0,
  capacity: 0,
  sonar: 0,
  light: 0,
  ascent: 0,
  balloon: 0,
  repellent: 0,
  magnet: 0,
  insurance: 0,
  medkit: 0,
  scooter: 0,
  harpoon: 0,
  submarine: 0,
  thermal: 0,
  pressure: 0,
  cutter: 0,
  camera: 0,
  boat: 0,
};

export interface Meta {
  expedition: number;
  perks: PerkLevels;
  research?: string[];
}

export const NO_META: Meta = { expedition: 0, perks: {} };

export const safeDepthFor = (level: number) => Math.round((80 + level * 45) * DEPTH_SCALE);
export const thermalFor = (level: number) => Math.max(0.25, 1 - level * 0.18);
export const cutTime = (level: number) => Math.max(0.6, 2 - level * 0.5);
export const cameraRange = photoRange;

export function maxLevel(def: UpgradeDef, expedition: number): number {
  return def.max + Math.min(expedition, def.extra);
}

export function unlocked(def: UpgradeDef, expedition: number): boolean {
  return expedition >= (def.unlockAt ?? 0);
}

const oxygenFor = (level: number) => 45 + level * 14;
const speedFor = (level: number) => 128 + level * 16;
const armorFor = (level: number) => Math.min(0.6, level * 0.11);
const sonarFor = (level: number) => (level ? 520 + (level - 1) * 280 : 0);
const magnetFor = (level: number) => level * 24;
const insuranceFor = (level: number) => (level ? 0.15 + (level - 1) * 0.1 : 0);


export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round((def.baseCost * Math.pow(def.growth, level)) / 10) * 10;
}

export function statsFor(levels: UpgradeLevels, relics: RelicId[] = [], challenge: ChallengeId | null = null, meta: Meta = NO_META): Stats {
  const bonus = relicBonus(relics);
  const scale = expeditionScale(meta.expedition);
  const perk = perkBonus(meta.perks);
  const rules = challenge ? CHALLENGES[challenge] : null;
  const lab = researchBonus(meta.research ?? []);
  return {
    oxygenMax: Math.round(oxygenFor(levels.tank) * (1 + bonus.oxygen + perk.oxygen) * (rules?.oxygen ?? 1)),
    speed: speedFor(levels.fins) * (1 + bonus.speed + lab.speed),
    armor: Math.min(0.7, armorFor(levels.suit) + bonus.armor),
    capacity: rules?.capacity ?? 2 + levels.capacity + lab.capacity,
    sonarRange: rules && !rules.sonar ? 0 : sonarFor(levels.sonar) * (1 + bonus.sonar + lab.sonar),
    light: levels.light,
    ascent: 1 + levels.ascent * 0.2 + bonus.ascent,
    boatSpeed: 170 + levels.boat * 30,
    boatLevel: levels.boat,
    balloons: levels.balloon + (levels.balloon > 0 ? bonus.balloons : 0),
    repellents: levels.repellent,
    moneyBonus: bonus.money,
    magnet: bonus.magnet + magnetFor(levels.magnet),
    insurance: insuranceFor(levels.insurance),
    medkits: levels.medkit + lab.medkits,
    scooter: levels.scooter,
    harpoons: levels.harpoon,
    submarine: levels.submarine,
    danger: scale.danger,
    sharkSpeed: scale.sharkSpeed,
    lootBonus: scale.loot + perk.loot + lab.loot,
    safeDepth: safeDepthFor(levels.pressure) + lab.depth,
    thermal: thermalFor(levels.thermal) * lab.thermal,
    cutter: levels.cutter,
    camera: levels.camera + 1 + lab.camera,
    drain: lab.drain,
  };
}
