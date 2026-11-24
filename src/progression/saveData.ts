import { DEFAULT_OCEAN, OCEAN_ORDER, type OceanId } from '../game/oceans';
import type { RelicId, SkinId, Supplies } from '../game/types';
import { chapterOf, QUESTS, type QuestState } from './quests';
import type { CharacterId } from './characters';
import type { PerkLevels } from './expedition';
import { EMPTY_LEVELS, type UpgradeLevels } from './upgrades';

export const SAVE_VERSION = 4;

export type Ending = 'guardian' | 'hidden' | 'power' | 'sacrifice';

const OLD_ENDINGS: Record<string, Ending> = { destroy: 'sacrifice', hide: 'hidden', share: 'guardian' };

export interface SaveData {
  version: number;
  money: number;
  upgrades: UpgradeLevels;
  missionsDone: string[];
  missionProgress: Record<string, number>;
  stats: { dives: number; successes: number; totalEarned: number; bestDepth: number; chests: number };
  settings: { music: boolean; sfx: boolean; haptics: boolean; markers: boolean };
  tutorialSeen: boolean;
  relics: RelicId[];
  explored: { left: number; right: number };
  discoveries: string[];
  skins: SkinId[];
  skin: SkinId;
  challengeDone: string;
  bossLoot: number;
  expedition: number;
  pearls: number;
  perks: PerkLevels;
  run: { earned: number; boss: boolean };
  shaftBest: number;
  storyChapter: number;
  ocean: OceanId;
  oceans: OceanId[];
  quests: Record<string, QuestState>;
  encyclopedia: Record<string, number>;
  researchData: number;
  research: string[];
  xp: number;
  ending: Ending | null;
  supplies: Supplies;
  flags: string[];
  pendingDialogs: string[];
  met: CharacterId[];
}

export const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  money: 0,
  upgrades: EMPTY_LEVELS,
  missionsDone: [],
  missionProgress: {},
  stats: { dives: 0, successes: 0, totalEarned: 0, bestDepth: 0, chests: 0 },
  settings: { music: true, sfx: true, haptics: true, markers: true },
  tutorialSeen: false,
  relics: [],
  explored: { left: 0, right: 0 },
  discoveries: [],
  skins: ['classic'],
  skin: 'classic',
  challengeDone: '',
  bossLoot: 0,
  expedition: 0,
  pearls: 0,
  perks: {},
  run: { earned: 0, boss: false },
  shaftBest: 0,
  storyChapter: 0,
  ocean: DEFAULT_OCEAN,
  oceans: [DEFAULT_OCEAN],
  quests: {},
  encyclopedia: {},
  researchData: 0,
  research: [],
  xp: 0,
  ending: null,
  supplies: { medkit: 0, balloon: 0, harpoon: 0 },
  flags: [],
  pendingDialogs: ['prologue', 'brief:first_dive'],
  met: [],
};


type RawSave = Partial<SaveData> & { abyssBest?: number };

export function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return DEFAULT_SAVE;
  const parsed = raw as RawSave;
  const { abyssBest, ...rest } = parsed;
  const version = parsed.version ?? 1;
  const chapter = version < 3 ? ((parsed.storyChapter ?? 0) >= 4 ? 1 : 0) : (parsed.storyChapter ?? 0);
  const oceans = OCEAN_ORDER.filter((id) => (parsed.oceans ?? []).includes(id) || OCEAN_ORDER.indexOf(id) <= chapter);
  return {
    ...DEFAULT_SAVE,
    ...rest,
    version: SAVE_VERSION,
    upgrades: { ...EMPTY_LEVELS, ...parsed.upgrades },
    stats: { ...DEFAULT_SAVE.stats, ...parsed.stats },
    settings: { ...DEFAULT_SAVE.settings, ...parsed.settings },
    explored: { ...DEFAULT_SAVE.explored, ...parsed.explored },
    perks: { ...parsed.perks },
    run: { ...DEFAULT_SAVE.run, ...parsed.run },
    shaftBest: parsed.shaftBest ?? abyssBest ?? 0,
    storyChapter: chapter,
    oceans,
    ocean: parsed.ocean && oceans.includes(parsed.ocean) ? parsed.ocean : DEFAULT_OCEAN,
    encyclopedia: { ...parsed.encyclopedia },
    research: [...(parsed.research ?? [])],
    supplies: { ...DEFAULT_SAVE.supplies, ...parsed.supplies },
    quests: version < 4 ? legacyQuests(parsed.quests ?? {}, chapter) : { ...parsed.quests },
    ending: parsed.ending ? (OLD_ENDINGS[parsed.ending] ?? parsed.ending) : null,
    flags: [...(parsed.flags ?? [])],
    pendingDialogs: version < 4 ? ['intro_existing', ...(chapter === 0 ? ['brief:first_dive'] : [])] : [...(parsed.pendingDialogs ?? [])],
    met: [...(parsed.met ?? [])],
  };
}

function legacyQuests(old: Record<string, QuestState>, chapter: number): Record<string, QuestState> {
  const quests: Record<string, QuestState> = {};
  for (const quest of QUESTS) {
    const done = old[quest.id]?.done || (quest.category === 'main' && chapterOf(quest) < chapter);
    if (done) quests[quest.id] = { done: true, progress: 0, flags: quest.steps.map((_, i) => `${quest.id}#${i}`) };
  }
  return quests;
}
