import type { ChallengeId, Condition } from './types';

export interface ConditionInfo {
  name: string;
  description: string;
  reward: number;
  weight: number;
}

export const CONDITIONS: Record<Condition, ConditionInfo> = {
  normal: { name: 'Klidné moře', description: 'Běžný ponor', reward: 1, weight: 60 },
  night: { name: 'Noční ponor', description: 'Tma, truhly svítí, poklady ×2', reward: 2, weight: 15 },
  storm: { name: 'Bouře', description: 'Silné proudy unáší potápěče, poklady ×1,3', reward: 1.3, weight: 15 },
  gold: { name: 'Zlatá horečka', description: 'Víc truhlic a mincí', reward: 1, weight: 10 },
};

export function rollCondition(random: () => number): Condition {
  const entries = Object.entries(CONDITIONS) as [Condition, ConditionInfo][];
  let roll = random() * entries.reduce((sum, [, c]) => sum + c.weight, 0);
  for (const [id, c] of entries) {
    roll -= c.weight;
    if (roll <= 0) return id;
  }
  return 'normal';
}

export interface ChallengeInfo {
  name: string;
  description: string;
  reward: number;
  oxygen: number;
  sonar: boolean;
  capacity: number | null;
  frenzy: boolean;
  condition: Condition | null;
}

export const CHALLENGES: Record<ChallengeId, ChallengeInfo> = {
  thin_air: { name: 'Řídký vzduch', description: 'Jen 60 % kyslíku', reward: 2, oxygen: 0.6, sonar: true, capacity: null, frenzy: false, condition: null },
  blind: { name: 'Naslepo', description: 'Bez sonaru a ve tmě', reward: 1.6, oxygen: 1, sonar: false, capacity: null, frenzy: false, condition: 'night' },
  frenzy: { name: 'Žraločí šílenství', description: 'Všichni žraloci loví', reward: 1.8, oxygen: 1, sonar: true, capacity: null, frenzy: true, condition: null },
  single: { name: 'Jedna truhla', description: 'Uneseš jen jednu truhlici', reward: 1.7, oxygen: 1, sonar: true, capacity: 1, frenzy: false, condition: null },
  night_owl: { name: 'Noční sova', description: 'Noční ponor s extra odměnou', reward: 1.5, oxygen: 1, sonar: true, capacity: null, frenzy: false, condition: 'night' },
};

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function challengeFor(key: string): ChallengeId {
  const ids = Object.keys(CHALLENGES) as ChallengeId[];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length];
}
