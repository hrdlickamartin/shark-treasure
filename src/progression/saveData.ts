import type { KitCounts, MaterialCounts } from '../game/gear';
import { DEFAULT_OCEAN, OCEAN_ORDER, WORLD_OCEANS, type OceanId } from '../game/oceans';
import type { RelicId, SkinId, Supplies } from '../game/types';
import { chapterOf, QUESTS, type QuestState } from './quests';
import type { CharacterId } from './characters';
import type { PerkLevels } from './expedition';
import { EMPTY_LEVELS, type UpgradeLevels } from './upgrades';
import type { ModId, ModSlot } from './crafting';
import { EMPTY_REPUTATION, type Reputation } from './factions';
import type { BoatModules, ModuleId } from './modules';

export const SAVE_VERSION = 5;

export type Ending = 'guardian' | 'hidden' | 'power' | 'sacrifice';

export type TideEnding = 'escort' | 'sleep' | 'harvest';

export interface Rift {
  id: string;
  ocean: OceanId;
  x: number;
  left: number;
}

export interface HuntSpot {
  ocean: OceanId;
  x: number;
  clue: string;
}

const OLD_ENDINGS: Record<string, Ending> = { destroy: 'sacrifice', hide: 'hidden', share: 'guardian' };

export interface SaveData {
  version: number;
  money: number;
  upgrades: UpgradeLevels;
  missionsDone: string[];
  missionProgress: Record<string, number>;
  stats: { dives: number; successes: number; totalEarned: number; bestDepth: number; chests: number };
  settings: { music: boolean; sfx: boolean; haptics: boolean; markers: boolean; reduceMotion: boolean; slowTide: boolean; rarityShapes: boolean; bigText: boolean };
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
  materials: MaterialCounts;
  kit: KitCounts;
  crafted: string[];
  mods: { owned: ModId[]; equipped: Partial<Record<ModSlot, ModId>> };
  modules: { owned: ModuleId[]; equipped: BoatModules };
  reputation: Reputation;
  contracts: { day: string; done: string[] };
  rifts: { active: Rift[]; closed: number; seq: number };
  shards: { pending: number; total: number };
  hunt: { pieces: number; active: HuntSpot | null; found: number };
  safari: { week: number; done: boolean };
  weekly: { week: number; best: number; depth: number; rewarded: boolean };
  aquarium: string[];
  tideChapter: number;
  tideEnding: TideEnding | null;
}

export const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  money: 0,
  upgrades: EMPTY_LEVELS,
  missionsDone: [],
  missionProgress: {},
  stats: { dives: 0, successes: 0, totalEarned: 0, bestDepth: 0, chests: 0 },
  settings: { music: true, sfx: true, haptics: true, markers: true, reduceMotion: false, slowTide: false, rarityShapes: false, bigText: false },
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
  materials: {},
  kit: {},
  crafted: [],
  mods: { owned: [], equipped: {} },
  modules: { owned: [], equipped: {} },
  reputation: EMPTY_REPUTATION,
  contracts: { day: '', done: [] },
  rifts: { active: [], closed: 0, seq: 0 },
  shards: { pending: 0, total: 0 },
  hunt: { pieces: 0, active: null, found: 0 },
  safari: { week: -1, done: false },
  weekly: { week: -1, best: 0, depth: 0, rewarded: false },
  aquarium: [],
  tideChapter: 0,
  tideEnding: null,
};

export const EXPANSION_FLAG = 'expansion';

export function expansionIntro(ending: Ending): string[] {
  return [`tide_intro_${ending}`, 'brief:tide_echo'];
}


type RawSave = Partial<SaveData> & { abyssBest?: number };

export function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return DEFAULT_SAVE;
  const parsed = raw as RawSave;
  const { abyssBest, ...rest } = parsed;
  const version = parsed.version ?? 1;
  const chapter = version < 3 ? ((parsed.storyChapter ?? 0) >= 4 ? 1 : 0) : (parsed.storyChapter ?? 0);
  const oceans = WORLD_OCEANS.filter((id) => (parsed.oceans ?? []).includes(id) || (OCEAN_ORDER.includes(id) && OCEAN_ORDER.indexOf(id) <= chapter));
  const ending = parsed.ending ? (OLD_ENDINGS[parsed.ending] ?? parsed.ending) : null;
  const expansionNew = version < 5 && !!ending;
  return withPortIntro({
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
    ending,
    flags: [...new Set([...(parsed.flags ?? []), ...(expansionNew ? [EXPANSION_FLAG] : [])])],
    pendingDialogs: [...(version < 4 ? ['intro_existing', ...(chapter === 0 ? ['brief:first_dive'] : [])] : [...(parsed.pendingDialogs ?? [])]), ...(expansionNew && ending ? expansionIntro(ending) : [])],
    met: [...(parsed.met ?? [])],
    materials: { ...parsed.materials },
    kit: { ...parsed.kit },
    crafted: [...(parsed.crafted ?? [])],
    mods: { owned: [...(parsed.mods?.owned ?? [])], equipped: { ...parsed.mods?.equipped } },
    modules: { owned: [...(parsed.modules?.owned ?? [])], equipped: { ...parsed.modules?.equipped } },
    reputation: { ...EMPTY_REPUTATION, ...parsed.reputation },
    contracts: { ...DEFAULT_SAVE.contracts, ...parsed.contracts },
    rifts: { ...DEFAULT_SAVE.rifts, ...parsed.rifts },
    shards: { ...DEFAULT_SAVE.shards, ...parsed.shards },
    hunt: { ...DEFAULT_SAVE.hunt, ...parsed.hunt },
    safari: { ...DEFAULT_SAVE.safari, ...parsed.safari },
    weekly: { ...DEFAULT_SAVE.weekly, ...parsed.weekly },
    aquarium: [...(parsed.aquarium ?? [])],
    tideChapter: expansionNew ? 9 : (parsed.tideChapter ?? 0),
    tideEnding: parsed.tideEnding ?? null,
  });
}

export const PORT_INTRO = 'port_intro';

function withPortIntro(save: SaveData): SaveData {
  if (save.storyChapter < 1 || save.flags.includes(PORT_INTRO)) return save;
  const fresh = !save.flags.includes(EXPANSION_FLAG);
  return { ...save, flags: [...save.flags, PORT_INTRO], pendingDialogs: fresh ? [...save.pendingDialogs, PORT_INTRO] : save.pendingDialogs };
}

function legacyQuests(old: Record<string, QuestState>, chapter: number): Record<string, QuestState> {
  const quests: Record<string, QuestState> = {};
  for (const quest of QUESTS) {
    const done = old[quest.id]?.done || (quest.category === 'main' && chapterOf(quest) < chapter);
    if (done) quests[quest.id] = { done: true, progress: 0, flags: quest.steps.map((_, i) => `${quest.id}#${i}`) };
  }
  return quests;
}
