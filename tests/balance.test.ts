import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHEST_WEIGHTS, CHESTS, SHARKS, SHARKS_PER_CHUNK } from '../src/game/catalog';
import { createGame, step } from '../src/game/engine';
import { OCEAN_ORDER, OCEANS, type OceanId } from '../src/game/oceans';
import { regionIndexAt } from '../src/game/regions';
import { startDive } from '../src/game/systems/dive';
import type { DiveResult, GameState, Input } from '../src/game/types';
import { bossChestValue, depthBonus, generateChunk, LEGENDARY_HP, tierValue } from '../src/game/world';
import { canEmbark, embarkChapter, embarkEarnings, embarkSave } from '../src/progression/embark';
import { applyDive, bossTrophies } from '../src/progression/progress';
import { CHAPTER_COUNT, QUESTS } from '../src/progression/quests';
import { DEFAULT_SAVE, migrateSave, type SaveData } from '../src/progression/saveData';
import { EMPTY_LEVELS, maxLevel, nextStoryChapter, statsFor, SUPPLY_LIMIT, supplyPrice, UPGRADES, upgradeCost, type UpgradeLevels } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

function world(ocean: OceanId, seed: number): GameState {
  return createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, seed, condition: 'normal' });
}

function run(state: GameState, seconds: number, policy: (s: GameState) => Input): DiveResult | null {
  for (let t = 0; t < seconds; t += DT) {
    const events = step(state, policy(state), DT, VIEW);
    const finished = events.find((e) => e.type === 'finished');
    if (finished && finished.type === 'finished') return finished.result;
  }
  return null;
}

function emptyResult(ocean: OceanId): DiveResult {
  const state = world(ocean, 7);
  startDive(state);
  state.diver.health = 0;
  return { ...run(state, 10, () => ({ x: 0, y: 0 }))!, success: true };
}

function saveWith(patch: Partial<SaveData>): SaveData {
  return migrateSave({ ...DEFAULT_SAVE, ...patch });
}

function chestValue(loot: number): number {
  const weights = CHEST_WEIGHTS[Math.min(CHEST_WEIGHTS.length - 1, loot)];
  const total = Object.values(weights).reduce((sum, w) => sum + (w ?? 0), 0);
  return Object.entries(weights).reduce((sum, [kind, w]) => sum + ((CHESTS[kind as keyof typeof CHESTS].min + CHESTS[kind as keyof typeof CHESTS].max) / 2) * (w ?? 0), 0) / total;
}

function regionValue(ocean: OceanId, region: number): number {
  let value = 0;
  let count = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const state = world(ocean, seed);
    state.chests = [];
    for (let i = -40; i <= 40; i++) generateChunk(state, i);
    for (const chest of state.chests) {
      if (chest.id.endsWith(':boss') || regionIndexAt(OCEANS[ocean].regions, chest.x) !== region) continue;
      value += chest.value;
      count += 1;
    }
  }
  return value / count;
}

test('každá úroveň vylepšení, kterou jde koupit, něco zlepší', () => {
  for (const def of UPGRADES) {
    const top = maxLevel(def, 10, CHAPTER_COUNT);
    for (let level = 0; level < top; level++) {
      const levels = (l: number): UpgradeLevels => ({ ...EMPTY_LEVELS, [def.id]: l });
      assert.notDeepEqual(statsFor(levels(level + 1)), statsFor(levels(level)), `${def.id} ${level} → ${level + 1}`);
      assert.notEqual(def.effect(level + 1), def.effect(level), `popis ${def.id} ${level} → ${level + 1}`);
    }
  }
});

test('příběh odemyká další úrovně vybavení po celou kampaň', () => {
  const growing = UPGRADES.filter((def) => (def.story?.length ?? 0) > 0);
  assert.ok(growing.length >= 15);
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    assert.ok(growing.some((def) => def.story!.includes(chapter)), `kapitola ${chapter} nic neodemkne`);
  }
  const tank = UPGRADES.find((u) => u.id === 'tank')!;
  assert.equal(nextStoryChapter(tank, 0), 2);
  assert.equal(nextStoryChapter(tank, CHAPTER_COUNT), null);
});

test('úroveň odemčená příběhem stojí nejvýš 8 dobrých ponorů v právě otevřeném oceánu', () => {
  for (const def of UPGRADES) {
    for (const chapter of def.story ?? []) {
      const ocean = OCEANS[OCEAN_ORDER[Math.min(chapter, OCEAN_ORDER.length - 1)]];
      const loot = ocean.regions[3].tier;
      const dive = chestValue(loot) * 3 * 1.5;
      const cost = upgradeCost(def, maxLevel(def, 0, chapter) - 1);
      assert.ok(cost <= dive * 8, `${def.id} v kapitole ${chapter}: ${cost} $ je ${(cost / dive).toFixed(1)} ponorů`);
    }
  }
});

test('harpuny stačí na každého bosse v kapitole, kdy na něj hráč narazí', () => {
  const harpoon = UPGRADES.find((u) => u.id === 'harpoon')!;
  OCEAN_ORDER.forEach((id, chapter) => {
    const hp = SHARKS[OCEANS[id].boss].hp ?? 1;
    assert.ok(maxLevel(harpoon, 0, chapter) >= hp, `${id}: ${maxLevel(harpoon, 0, chapter)} harpun na ${hp} životů`);
  });
  for (const id of ['riptide', 'wandering'] as OceanId[]) {
    const hp = SHARKS[OCEANS[id].boss].hp ?? 1;
    assert.ok(maxLevel(harpoon, 0, CHAPTER_COUNT) >= hp, id);
  }
  for (const id of [...OCEAN_ORDER, 'riptide', 'wandering'] as OceanId[]) {
    const legendary = Math.floor((SHARKS[OCEANS[id].boss].hp ?? 1) * LEGENDARY_HP);
    assert.ok(maxLevel(harpoon, 0, CHAPTER_COUNT) + SUPPLY_LIMIT >= legendary, `legendární ${id}: ${legendary} životů`);
  }
});

test('poražený boss dá poprvé trofej s perlou, příště menší odměnu a v legendě dvojnásobek', () => {
  const save = saveWith({ storyChapter: 1, oceans: ['caribbean', 'arctic'] });
  const kill = { ...emptyResult('arctic'), discoveries: ['defeated:leviathan', 'defeated:leviathan'] };
  const first = applyDive(save, kill);
  assert.deepEqual(first.summary.trophies, [{ boss: 'leviathan', money: 2500, first: true }]);
  assert.equal(first.save.pearls, save.pearls + 1);
  assert.ok(first.save.discoveries.includes('defeated:leviathan'));
  const again = applyDive(first.save, kill);
  assert.deepEqual(again.summary.trophies, [{ boss: 'leviathan', money: 750, first: false }]);
  assert.equal(again.save.pearls, first.save.pearls);
  assert.equal(bossTrophies(first.save.discoveries, { ...kill, variant: 'legendary' })[0].money, 1500);
  assert.deepEqual(applyDive(save, emptyResult('arctic')).summary.trophies, []);
});

test('nová výprava chce další kapitolu příběhu, poklad bosse a výdělek, ne lodní motor', () => {
  const ready = saveWith({ storyChapter: 1, run: { earned: embarkEarnings(0), boss: true } });
  assert.equal(canEmbark(ready), true);
  assert.equal(canEmbark({ ...ready, run: { earned: embarkEarnings(0), boss: false } }), false);
  const next = embarkSave(ready);
  assert.equal(canEmbark({ ...next, run: { earned: embarkEarnings(1), boss: true } }), false, 'druhá výprava chce dokončenou Arktidu');
  assert.equal(canEmbark({ ...next, storyChapter: embarkChapter(1), run: { earned: embarkEarnings(1), boss: true } }), true);
  assert.equal(embarkChapter(20), CHAPTER_COUNT);
  assert.ok(embarkEarnings(9) > embarkEarnings(1));
});

test('zásoby na příští ponor mají strop a s kapitolou zdražují', () => {
  assert.ok(supplyPrice('harpoon', 5) > supplyPrice('harpoon', 0));
  const state = createGame(statsFor({ ...EMPTY_LEVELS, harpoon: 1 }), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, supplies: { medkit: 0, balloon: 0, harpoon: SUPPLY_LIMIT } });
  startDive(state);
  assert.equal(state.diver.harpoons, 1 + SUPPLY_LIMIT);
  state.diver.y = 2;
  state.diver.vy = -50;
  const quick = run(state, 4, () => ({ x: 0, y: -1 }));
  assert.equal(quick, null, 'rychlý návrat nekončí výsledkem');
  assert.equal(state.phase, 'boat');
  assert.equal(state.supplies.harpoon, SUPPLY_LIMIT, 'nespotřebované zásoby zůstanou na další ponor');
});

test('nejhlubší lokace Karibiku vynáší méně než nejhlubší lokace Arktidy', () => {
  const deepest = regionValue('caribbean', 5);
  assert.ok(deepest < regionValue('arctic', 5) * 0.95, `Karibik ${Math.round(deepest)} $`);
  assert.ok(deepest > regionValue('caribbean', 4), 'hlubší lokace pořád vynáší víc');
  assert.ok(deepest < regionValue('arctic', 4), 'Karibik nepřebije ani předposlední lokaci Arktidy');
  assert.ok(bossChestValue('caribbean') < bossChestValue('arctic'));
  assert.ok(bossChestValue('abyss') > bossChestValue('arctic'));
});

test('každá hlubší lokace má cennější truhly než ta před ní', () => {
  for (const id of [...OCEAN_ORDER, 'riptide', 'wandering'] as OceanId[]) {
    const regions = OCEANS[id].regions;
    const values = regions.map((region, i) => tierValue(region.tier) * (region.lootScale ?? 1) * depthBonus(regions, i));
    values.slice(1).forEach((value, i) => assert.ok(value > values[i], `${id} L${i + 1}: ${Math.round(value)} ≤ ${Math.round(values[i])}`));
  }
  assert.ok(regionValue('arctic', 3) > regionValue('arctic', 2), 'Arktida L3 už nevynáší míň než L2');
});

function sharksIn(ocean: OceanId, region: number): number {
  let sharks = 0;
  let chunks = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const state = world(ocean, seed);
    state.sharks = [];
    for (let i = -40; i <= 40; i++) {
      generateChunk(state, i);
      if (regionIndexAt(OCEANS[ocean].regions, i * 480 + 240) === region) chunks += 1;
    }
    sharks += state.sharks.filter((s) => regionIndexAt(OCEANS[ocean].regions, s.x) === region).length;
  }
  return sharks / chunks;
}

test('žraloků s hloubkou přibývá plynule, bez skoku mezi Pirate Bay a Blue Hole', () => {
  SHARKS_PER_CHUNK.slice(2).forEach((count, i) => assert.ok(count - SHARKS_PER_CHUNK[i + 1] <= 0.4, `tier ${i + 2}`));
  const bay = sharksIn('caribbean', 1);
  const hole = sharksIn('caribbean', 2);
  assert.ok(hole > bay, 'hlouběji je pořád víc žraloků');
  assert.ok(hole < bay * 2.5, `Pirate Bay ${bay.toFixed(2)} → Blue Hole ${hole.toFixed(2)}`);
});

test('Arktida má vedlejší questy a úkol s kosatkou přidá harpunu jen do stropu kapitoly', () => {
  assert.ok(QUESTS.filter((q) => q.ocean === 'arctic').length >= 9);
  const save = saveWith({ storyChapter: 1, oceans: ['caribbean', 'arctic'], quests: { first_dive: { done: true, progress: 0, flags: [] }, arc_station: { done: true, progress: 0, flags: [] } }, upgrades: { ...EMPTY_LEVELS, harpoon: 4 } });
  const { save: next, summary } = applyDive(save, { ...emptyResult('arctic'), photos: [{ species: 'orca', stars: 2 }] });
  assert.ok(next.quests.arc_orca.done);
  assert.ok(summary.quests.some((q) => q.id === 'arc_orca'));
  assert.equal(next.upgrades.harpoon, 4, 'strop harpuny v kapitole 1 je 4');
});
