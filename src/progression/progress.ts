import { addCounts, type MaterialCounts } from '../game/gear';
import { todayKey } from '../game/modifiers';
import { OCEAN_ORDER, weekIndex, type OceanId } from '../game/oceans';
import { addReputation, FACTION_IDS } from './factions';
import { equipped } from './modules';
import { activeModules, applyTideDive, expansionOn, hasFlag } from './tides';
import type { DiveResult, RelicId } from '../game/types';
import type { CharacterId } from './characters';
import { dialogueFor } from './dialogue';
import { applyPhotos } from './encyclopedia';
import { expeditionScale, shaftPearls } from './expedition';
import { applyMissions, type MissionDef } from './missions';
import { activeQuests, CHAPTER_COUNT, chapterOf, EMPTY_QUEST, oceansAfter, pendingChoice, progressQuest, questById, stepKey, type QuestDef } from './quests';
import { explorerLevel, levelReward } from './research';
import type { SaveData } from './saveData';
import { maxLevel, UPGRADES } from './upgrades';

const MAX_BRIEFS = 3;

export interface ResultSummary {
  result: DiveResult;
  missions: MissionDef[];
  missionReward: number;
  missionScale: number;
  shaftPearls: number;
  shaftRecord: boolean;
  quests: QuestDef[];
  questReward: number;
  photos: string[];
  xp: number;
  research: number;
  levelUps: number[];
  levelReward: number;
  unlocked: OceanId[];
  chapter: number | null;
  ending: boolean;
  newRelics: RelicId[];
  materials: MaterialCounts;
  materialsLost: MaterialCounts;
  contracts: string[];
  safari: boolean;
  weekly: boolean;
  hunt: boolean;
  shards: number;
}

export interface Settlement {
  save: SaveData;
  completed: QuestDef[];
  unlocked: OceanId[];
  money: number;
  xp: number;
  research: number;
  pearls: number;
}

function enqueue(save: SaveData, ids: string[]): string[] {
  const queue = [...save.pendingDialogs];
  for (const id of ids) if (!queue.includes(id) && dialogueFor(id)) queue.push(id);
  return queue;
}

function speakers(ids: string[]): CharacterId[] {
  return ids.flatMap((id) => dialogueFor(id)?.lines.map((l) => l.who) ?? []);
}

function metaGoalDone(save: SaveData, quest: QuestDef, goal: QuestDef['steps'][number]): boolean {
  if (goal.kind === 'reputation') {
    if (goal.faction) return save.reputation[goal.faction] >= goal.points;
    return FACTION_IDS.filter((f) => save.reputation[f] >= goal.points).length >= (goal.factions ?? 1);
  }
  if (goal.kind === 'craft') return save.crafted.length > 0;
  if (goal.kind === 'rifts') return save.rifts.closed >= goal.count;
  return false;
}

function metaProgress(save: SaveData, quests: Record<string, SaveData['quests'][string]>): Record<string, SaveData['quests'][string]> {
  const next = { ...quests };
  for (const quest of activeQuests(quests, save.oceans, save.flags)) {
    const state = next[quest.id] ?? EMPTY_QUEST;
    const flags = new Set(state.flags);
    quest.steps.forEach((goal, i) => {
      if (!flags.has(stepKey(quest.id, i)) && metaGoalDone(save, quest, goal)) flags.add(stepKey(quest.id, i));
    });
    if (flags.size === state.flags.length) continue;
    next[quest.id] = { ...state, flags: [...flags], done: quest.steps.every((_, i) => flags.has(stepKey(quest.id, i))) };
  }
  return next;
}

export function settle(before: SaveData, incoming: Record<string, SaveData['quests'][string]>): Settlement {
  const quests = metaProgress(before, incoming);
  const completed = Object.keys(quests)
    .filter((id) => quests[id].done && !before.quests[id]?.done)
    .map((id) => questById(id))
    .filter((q): q is QuestDef => !!q);
  let storyChapter = before.storyChapter;
  let tideChapter = before.tideChapter;
  const flags = new Set(before.flags);
  const unlockedOceans: OceanId[] = [];
  let materials = before.materials;
  let kit = before.kit;
  let reputation = before.reputation;
  const upgrades = { ...before.upgrades };
  let money = 0;
  let xp = 0;
  let research = 0;
  let pearls = 0;
  const dialogs: string[] = [];
  for (const quest of completed) {
    money += quest.reward.money;
    xp += quest.reward.xp;
    research += quest.reward.research;
    pearls += quest.reward.pearls;
    if (quest.reward.flag) flags.add(quest.reward.flag);
    if (quest.reward.upgrade) {
      const def = UPGRADES.find((u) => u.id === quest.reward.upgrade!.id)!;
      upgrades[def.id] = Math.min(maxLevel(def, before.expedition), upgrades[def.id] + quest.reward.upgrade.levels);
    }
    if (quest.reward.materials) materials = addCounts(materials, quest.reward.materials);
    if (quest.reward.kit) kit = addCounts(kit, quest.reward.kit);
    if (quest.reward.reputation) reputation = addReputation(reputation, quest.reward.reputation.faction, quest.reward.reputation.amount);
    if (quest.unlocks) unlockedOceans.push(quest.unlocks);
    dialogs.push(`debrief:${quest.id}`);
    if (quest.chapterEnd && quest.chapter) {
      tideChapter = Math.max(tideChapter, quest.chapter + 1);
      dialogs.push(`tide_hook_${chapterOf(quest)}`);
    } else if (quest.chapterEnd) {
      storyChapter = Math.max(storyChapter, chapterOf(quest) + 1);
      dialogs.push(`hook_${chapterOf(quest)}`);
    }
  }
  const oceans = [...new Set([...before.oceans, ...oceansAfter(storyChapter), ...unlockedOceans])];
  const flagList = [...flags];
  const wasActive = new Set(activeQuests(before.quests, before.oceans, before.flags).map((q) => q.id));
  const nowActive = activeQuests(quests, oceans, flagList);
  const fresh = nowActive.filter((q) => !wasActive.has(q.id));
  const briefs = fresh.filter((q) => q.briefing).slice(0, MAX_BRIEFS).map((q) => `brief:${q.id}`);
  const choices = nowActive.filter((q) => q.choice && pendingChoice(q, quests[q.id] ?? EMPTY_QUEST) >= 0).map((q) => `choice:${q.id}`);
  const queued = [...dialogs, ...briefs, ...choices];
  const save: SaveData = {
    ...before,
    quests,
    storyChapter,
    tideChapter,
    oceans,
    flags: flagList,
    upgrades,
    materials,
    kit,
    reputation,
    money: before.money + money,
    xp: before.xp + xp,
    researchData: before.researchData + research,
    pearls: before.pearls + pearls,
    pendingDialogs: enqueue(before, queued),
    met: [...new Set([...before.met, ...speakers(queued)])],
  };
  return { save, completed, unlocked: oceans.filter((o) => !before.oceans.includes(o)), money, xp, research, pearls };
}

export function applyDive(current: SaveData, result: DiveResult): { save: SaveData; summary: ResultSummary } {
  const endless = result.mode === 'endless';
  const missions = endless ? { done: current.missionsDone, progress: current.missionProgress, completed: [] } : applyMissions(result, current.missionsDone, current.missionProgress);
  const missionScale = expeditionScale(current.expedition).missions;
  const missionReward = missions.completed.reduce((sum, m) => sum + Math.round(m.reward * missionScale), 0);
  const quests = { ...current.quests };
  if (!endless) {
    for (const quest of activeQuests(current.quests, current.oceans, current.flags)) {
      if (quest.ocean !== result.ocean) continue;
      quests[quest.id] = progressQuest(quest, current.quests[quest.id] ?? EMPTY_QUEST, result);
    }
  }
  const photos = applyPhotos(current.encyclopedia, result.photos);
  const newRelics = result.relics.filter((r) => !current.relics.includes(r));
  const newPlaces = result.discoveries.filter((d) => d.startsWith('loc:') && !current.discoveries.includes(d));
  const diveResearch = photos.reward.research + newPlaces.length * 8 + newRelics.length * 20;
  const diveXp = Math.round(result.maxDepthM / 2) + (result.success ? result.chests.length * 10 : 0) + newPlaces.length * 15 + photos.reward.xp + missions.completed.length * 20;

  const base: SaveData = {
    ...current,
    money: current.money + result.total + missionReward,
    encyclopedia: photos.book,
    researchData: current.researchData + diveResearch,
    xp: current.xp + diveXp,
    pearls: current.pearls + (endless ? shaftPearls(current.shaftBest, result.maxDepthM) : 0),
    supplies: { medkit: 0, balloon: 0, harpoon: 0 },
    shaftBest: endless ? Math.max(current.shaftBest, result.maxDepthM) : current.shaftBest,
    missionsDone: missions.done,
    missionProgress: missions.progress,
    relics: [...current.relics, ...newRelics],
    explored: {
      left: Math.max(current.explored.left, -Math.min(0, result.minX)),
      right: Math.max(current.explored.right, Math.max(0, result.maxX)),
    },
    discoveries: [...current.discoveries, ...result.discoveries.filter((d) => !current.discoveries.includes(d))],
    challengeDone: result.challenge ? todayKey() : current.challengeDone,
    bossLoot: current.bossLoot + (result.bossLoot ? 1 : 0),
    stats: {
      dives: current.stats.dives + 1,
      successes: current.stats.successes + (result.success ? 1 : 0),
      totalEarned: current.stats.totalEarned,
      bestDepth: Math.max(current.stats.bestDepth, result.maxDepthM),
      chests: current.stats.chests + (result.success ? result.chests.length : 0),
    },
  };
  const tide = expansionOn(current) ? applyTideDive(base, result, todayKey(), weekIndex(), equipped(activeModules(current), 'aquarium')) : null;
  const settled = settle(tide ? tide.save : base, quests);
  const beforeLevel = explorerLevel(current.xp);
  const afterLevel = explorerLevel(settled.save.xp);
  const levelUps = Array.from({ length: afterLevel - beforeLevel }, (_, i) => beforeLevel + i + 1);
  const levelMoney = levelUps.reduce((sum, l) => sum + levelReward(l).money, 0);
  const levelPearls = levelUps.reduce((sum, l) => sum + levelReward(l).pearls, 0);
  const earned = result.total + missionReward + settled.money + levelMoney;
  const save: SaveData = {
    ...settled.save,
    money: settled.save.money + levelMoney,
    pearls: settled.save.pearls + levelPearls,
    run: { earned: current.run.earned + earned, boss: current.run.boss || result.bossLoot },
    stats: { ...settled.save.stats, totalEarned: current.stats.totalEarned + earned },
  };
  const main = settled.completed.find((q) => q.chapterEnd);
  return {
    save,
    summary: {
      result,
      missions: missions.completed,
      missionReward,
      missionScale,
      shaftPearls: endless ? shaftPearls(current.shaftBest, result.maxDepthM) : 0,
      shaftRecord: endless && result.maxDepthM > current.shaftBest,
      quests: settled.completed,
      questReward: settled.money,
      photos: photos.reward.improved,
      xp: diveXp + settled.xp,
      research: diveResearch + settled.research,
      levelUps,
      levelReward: levelMoney,
      unlocked: settled.unlocked,
      chapter: main ? chapterOf(main) : null,
      ending: !!main && !main.chapter && save.storyChapter >= CHAPTER_COUNT && !current.ending,
      newRelics,
      materials: result.materials,
      materialsLost: result.materialsLost,
      contracts: tide?.contracts ?? [],
      safari: tide?.safari ?? false,
      weekly: tide?.weekly ?? false,
      hunt: tide?.hunt ?? false,
      shards: tide?.shards ?? 0,
    },
  };
}

export function choiceAvailable(save: SaveData, needs?: string[]): boolean {
  return !needs || needs.every((f) => hasFlag(save, f));
}

export function resettle(save: SaveData): SaveData {
  return settle(save, save.quests).save;
}

export function applyChoice(current: SaveData, questId: string, optionId: string): Settlement | null {
  const quest = questById(questId);
  const option = quest?.choice?.options.find((o) => o.id === optionId);
  if (!quest || !option || !choiceAvailable(current, option.needsFlag)) return null;
  if ((option.money ?? 0) < 0 && current.money < -(option.money ?? 0)) return null;
  const state = current.quests[questId] ?? EMPTY_QUEST;
  const step = pendingChoice(quest, state);
  if (step < 0) return null;
  const flags = [...new Set([...state.flags, stepKey(questId, step), `${questId}=${optionId}`])];
  const done = quest.steps.every((_, s) => flags.includes(stepKey(questId, s)));
  const base: SaveData = {
    ...current,
    money: current.money + (option.money ?? 0),
    researchData: current.researchData + (option.research ?? 0),
    pearls: current.pearls + (option.pearls ?? 0),
    flags: option.flag && !current.flags.includes(option.flag) ? [...current.flags, option.flag] : current.flags,
    pendingDialogs: current.pendingDialogs.filter((id) => id !== `choice:${questId}`),
  };
  return settle(base, { ...current.quests, [questId]: { ...state, done, flags } });
}

export function chapterOceans(chapter: number): OceanId[] {
  return OCEAN_ORDER.slice(0, chapter + 1);
}
