import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_LEVELS, type UpgradeLevels } from './upgrades';

const KEY = 'shark-treasure-save-v1';

export interface SaveData {
  money: number;
  upgrades: UpgradeLevels;
  missionsDone: string[];
  missionProgress: Record<string, number>;
  stats: { dives: number; successes: number; totalEarned: number; bestDepth: number; chests: number };
  settings: { music: boolean; sfx: boolean; haptics: boolean };
  tutorialSeen: boolean;
}

export const DEFAULT_SAVE: SaveData = {
  money: 0,
  upgrades: EMPTY_LEVELS,
  missionsDone: [],
  missionProgress: {},
  stats: { dives: 0, successes: 0, totalEarned: 0, bestDepth: 0, chests: 0 },
  settings: { music: true, sfx: true, haptics: true },
  tutorialSeen: false,
};

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SAVE;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULT_SAVE,
      ...parsed,
      upgrades: { ...EMPTY_LEVELS, ...parsed.upgrades },
      stats: { ...DEFAULT_SAVE.stats, ...parsed.stats },
      settings: { ...DEFAULT_SAVE.settings, ...parsed.settings },
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export async function writeSave(data: SaveData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}
