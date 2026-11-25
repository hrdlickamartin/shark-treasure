import type { MaterialCounts } from '../game/gear';
import { hash } from '../game/rng';
import type { DiveResult } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';
import type { CharacterId } from './characters';

export type FactionId = 'guild' | 'institute' | 'brotherhood' | 'tidewatch';

export interface FactionDef {
  id: FactionId;
  name: string;
  leader: CharacterId;
  wants: string;
  rewards: string;
  icon: SpriteName;
  color: string;
  rival: FactionId;
  expansion?: boolean;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  guild: { id: 'guild', name: 'Přístavní cech', leader: 'nora', wants: 'Bezpečné trasy, obchod, záchranné akce', rewards: 'Moduly lodi, obchodní zakázky', icon: 'icon_guild', color: '#FFBF32', rival: 'brotherhood' },
  institute: { id: 'institute', name: 'Oceánský institut', leader: 'idris', wants: 'Výzkum, muzeum, ochrana Strážce', rewards: 'Výzkumná data, akvárium, biogel', icon: 'icon_institute', color: '#20D4E8', rival: 'tidewatch' },
  brotherhood: { id: 'brotherhood', name: 'Bratrstvo volných potápěčů', leader: 'harlan', wants: 'Volnost, závody, poklady pro toho, kdo je najde', rewards: 'Mapy v lahvi, závodní vybavení', icon: 'icon_brotherhood', color: '#FF9A3C', rival: 'guild' },
  tidewatch: { id: 'tidewatch', name: 'Tidewatch', leader: 'diego', wants: 'Kontrolu nad proudy a trhlinami', rewards: 'Atlantská technologie, úlomky', icon: 'icon_tidewatch', color: '#AD65F5', rival: 'institute', expansion: true },
};

export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];

export const TIERS = [
  { name: 'Neznámý', points: 0, unlocks: 'Základní zakázky' },
  { name: 'Známý', points: 150, unlocks: 'První recept frakce' },
  { name: 'Důvěryhodný', points: 400, unlocks: 'Modul lodi frakce, sleva 10 %' },
  { name: 'Respektovaný', points: 800, unlocks: 'Příběhová linka frakce' },
  { name: 'Legenda', points: 1400, unlocks: 'Legendární recept, spojenec ve finále' },
];

export type Reputation = Record<FactionId, number>;

export const EMPTY_REPUTATION: Reputation = { guild: 0, institute: 0, brotherhood: 0, tidewatch: 0 };

export function tierOf(points: number): number {
  let tier = 0;
  TIERS.forEach((t, i) => {
    if (points >= t.points) tier = i;
  });
  return tier;
}

export function addReputation(rep: Reputation, faction: FactionId, amount: number, rivalPenalty = 0): Reputation {
  const next = { ...rep, [faction]: Math.max(0, rep[faction] + amount) };
  if (rivalPenalty > 0) {
    const rival = FACTIONS[faction].rival;
    next[rival] = Math.max(0, next[rival] - rivalPenalty);
  }
  return next;
}

export const discountFor = (rep: Reputation, faction: FactionId) => (tierOf(rep[faction]) >= 2 ? 0.9 : 1);

export type ContractKind = 'materials' | 'chests' | 'photo' | 'depth' | 'heavy' | 'gates' | 'scans' | 'shard';

export interface Contract {
  id: string;
  faction: FactionId;
  kind: ContractKind;
  label: string;
  need: number;
  materials?: MaterialCounts;
  species?: string;
  money: number;
  rep: number;
  expansion?: boolean;
}

const TEMPLATES: Record<FactionId, Omit<Contract, 'id' | 'faction'>[]> = {
  guild: [
    { kind: 'materials', label: 'Dodej 4 kusy šrotu na opravu mola', need: 1, materials: { scrap: 4 }, money: 900, rep: 50 },
    { kind: 'materials', label: 'Dodej 4 lana pro rybáře', need: 1, materials: { rope: 4 }, money: 900, rep: 50 },
    { kind: 'chests', label: 'Vynes 3 truhly v jednom ponoru', need: 3, money: 1200, rep: 60 },
    { kind: 'heavy', label: 'Doruč těžkou truhlu', need: 1, money: 1500, rep: 70, expansion: true },
  ],
  institute: [
    { kind: 'photo', label: 'Vyfoť barakudu', need: 1, species: 'barracuda', money: 700, rep: 60, expansion: true },
    { kind: 'photo', label: 'Vyfoť rejnoka', need: 1, species: 'ray', money: 700, rep: 60 },
    { kind: 'scans', label: 'Nech Pipa naskenovat 2 tvory v jednom ponoru', need: 2, money: 800, rep: 60, expansion: true },
    { kind: 'materials', label: 'Dodej 3 dávky biogelu', need: 1, materials: { biogel: 3 }, money: 900, rep: 55 },
  ],
  brotherhood: [
    { kind: 'depth', label: 'Dosáhni hloubky 80 m', need: 80, money: 900, rep: 55 },
    { kind: 'gates', label: 'Proplav 2 přílivovými branami', need: 2, money: 1000, rep: 60, expansion: true },
    { kind: 'chests', label: 'Vynes 2 truhly bez zásahu', need: 2, money: 1100, rep: 60 },
    { kind: 'heavy', label: 'Doruč těžkou truhlu', need: 1, money: 1400, rep: 65, expansion: true },
  ],
  tidewatch: [
    { kind: 'shard', label: 'Uzavři trhlinu a přines úlomek', need: 1, money: 1600, rep: 80, expansion: true },
    { kind: 'materials', label: 'Dodej 1 atlantskou slitinu', need: 1, materials: { alloy: 1 }, money: 1400, rep: 70 },
    { kind: 'depth', label: 'Dosáhni hloubky 100 m', need: 100, money: 1100, rep: 60 },
  ],
};

export const factionsFor = (expansion: boolean): FactionId[] => FACTION_IDS.filter((f) => expansion || !FACTIONS[f].expansion);

export function contractsFor(day: string, expansion = true): Contract[] {
  const seed = [...day].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return FACTION_IDS.flatMap((faction, i) => {
    if (!expansion && FACTIONS[faction].expansion) return [];
    const pool = expansion ? TEMPLATES[faction] : TEMPLATES[faction].filter((t) => !t.expansion);
    const template = pool[hash(seed, i) % pool.length];
    return [{ ...template, id: `${day}:${faction}`, faction }];
  });
}

export function contractMet(contract: Contract, result: DiveResult, shards: number): boolean {
  if (!result.success && contract.kind !== 'depth') return false;
  switch (contract.kind) {
    case 'chests':
      return result.chests.length >= contract.need && (contract.faction !== 'brotherhood' || result.hits === 0);
    case 'photo':
      return result.photos.some((p) => p.species === contract.species);
    case 'depth':
      return result.maxDepthM >= contract.need;
    case 'heavy':
      return result.heavy >= contract.need;
    case 'gates':
      return result.gates >= contract.need;
    case 'scans':
      return result.scans.filter((s) => !s.startsWith('net:')).length >= contract.need;
    case 'shard':
      return shards >= contract.need;
    default:
      return false;
  }
}

export interface ShardReward {
  money: number;
  research: number;
  materials: MaterialCounts;
  bottles: number;
  text: string;
}

export const SHARD_REWARDS: Record<FactionId, ShardReward> = {
  guild: { money: 1500, research: 0, materials: {}, bottles: 0, text: 'Prodat Cechu: 1 500 $' },
  institute: { money: 0, research: 60, materials: {}, bottles: 0, text: 'Darovat Institutu: 60 výzkumných dat' },
  brotherhood: { money: 400, research: 0, materials: {}, bottles: 1, text: 'Vyměnit s Bratrstvem: útržek mapy a 400 $' },
  tidewatch: { money: 0, research: 0, materials: { alloy: 2 }, bottles: 0, text: 'Předat Tidewatch: 2 atlantské slitiny' },
};

export const SHARD_REP = 100;
export const SHARD_PENALTY = 40;
