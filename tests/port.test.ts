import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, step } from '../src/game/engine';
import { weekIndex, type OceanId } from '../src/game/oceans';
import { startDive } from '../src/game/systems/dive';
import type { DiveResult, GameState, Input } from '../src/game/types';
import { generateChunk } from '../src/game/world';
import { RECIPES } from '../src/progression/crafting';
import { contractsFor, FACTION_IDS } from '../src/progression/factions';
import { MODULE_IDS, MODULES } from '../src/progression/modules';
import { applyDive, CAMPAIGN_REPUTATION, settle } from '../src/progression/progress';
import { QUESTS, type QuestState } from '../src/progression/quests';
import { DEFAULT_SAVE, migrateSave, PORT_INTRO, type SaveData } from '../src/progression/saveData';
import { craft, moduleLocked, portOn, safariTarget } from '../src/progression/tides';
import { EMPTY_LEVELS, statsFor } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

function world(ocean: OceanId, seed: number, flags: { expansion?: boolean; workshop?: boolean }): GameState {
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, seed, condition: 'normal', ...flags });
  for (let i = -24; i <= 24; i++) state.chunks.set(i, generateChunk(state, i));
  return state;
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
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, seed: 5 });
  startDive(state);
  state.diver.health = 0;
  return { ...run(state, 10, () => ({ x: 0, y: 0 }))!, success: true };
}

function saveWith(patch: Partial<SaveData>): SaveData {
  return migrateSave({ ...DEFAULT_SAVE, ...patch });
}

function done(...ids: string[]): Record<string, QuestState> {
  return Object.fromEntries(ids.map((id) => [id, { done: true, progress: 0, flags: QUESTS.find((q) => q.id === id)!.steps.map((_, i) => `${id}#${i}`) }]));
}

const ids = <T extends { id: string }>(list: T[]) => list.map((x) => x.id).sort();

test('přístav se otevře po Karibiku, rozšíření až po kampani', () => {
  assert.equal(portOn(saveWith({})), false);
  assert.equal(portOn(saveWith({ storyChapter: 1 })), true);
  assert.equal(portOn(saveWith({ flags: ['expansion'] })), true);
});

test('s přístavem jsou v původních oceánech materiály, ale nic jiného z rozšíření a zbytek světa se nemění', () => {
  let caves = 0;
  for (const seed of [3, 11, 27]) {
    const plain = world('pacific', seed, {});
    const port = world('pacific', seed, { workshop: true });
    const full = world('pacific', seed, { expansion: true });
    const materials = port.props.filter((p) => p.kind === 'material');
    assert.ok(materials.length > 5);
    assert.deepEqual(ids(materials), ids(full.props.filter((p) => p.kind === 'material')), 'materiály stejné jako s rozšířením');
    assert.deepEqual(ids(port.chests), ids(plain.chests));
    assert.deepEqual(ids(port.sharks), ids(plain.sharks));
    assert.deepEqual(ids(port.hazards), ids(plain.hazards));
    assert.equal(port.props.filter((p) => p.kind !== 'material').length, plain.props.length);
    caves += [...plain.chunks.values()].filter((chunk) => chunk.cave).length;
    assert.ok(![...port.chunks.values()].some((chunk) => chunk.cave?.unstable));
  }
  assert.ok(caves > 0, 'test vidí jeskyně');
});

test('ponor s přístavem přidá materiály, odečte výbavu a splní zakázku, safari jen s rozšířením', () => {
  const week = weekIndex();
  const target = safariTarget(week);
  const save = saveWith({ storyChapter: 1, oceans: ['caribbean', 'arctic'], kit: { flare: 2 } });
  const result: DiveResult = { ...emptyResult('arctic'), materials: { ice: 2 }, kitUsed: { flare: 1 }, maxDepthM: 120, photos: [{ species: target.species, stars: 3, behavior: target.behavior }] };
  const { save: next } = applyDive(save, result);
  assert.equal(next.materials.ice, 2);
  assert.equal(next.kit.flare, 1);
  assert.equal(next.safari.done, false);
  const withExpansion = applyDive({ ...save, flags: [...save.flags, 'expansion'] }, result).save;
  assert.equal(withExpansion.safari.done, true);
});

test('před rozšířením nejde koupit nic, co by bez něj nefungovalo', () => {
  const rich = saveWith({ storyChapter: 3, money: 100000, materials: { scrap: 50, rope: 50, nacre: 50, ice: 50, obsidian: 50, biogel: 50, alloy: 50 }, reputation: { guild: 1500, institute: 1500, brotherhood: 1500, tidewatch: 1500 } });
  for (const recipe of RECIPES) assert.equal(craft(rich, recipe.id) === null, !!recipe.expansion, recipe.id);
  for (const id of MODULE_IDS) assert.equal(moduleLocked(rich, id), !!MODULES[id].expansion, id);
  for (let d = 1; d <= 28; d++) {
    const contracts = contractsFor(`2026-12-${String(d).padStart(2, '0')}`, false);
    assert.equal(contracts.length, FACTION_IDS.length - 1, 'Tidewatch až s rozšířením');
    for (const c of contracts) {
      assert.ok(['materials', 'chests', 'photo', 'depth'].includes(c.kind), c.label);
      assert.notEqual(c.species, 'barracuda');
    }
  }
});

test('questy kampaně přidávají reputaci frakci zadavatele a po Karibiku přijde úvod přístavu', () => {
  const save = saveWith({ quests: done('first_dive', 'familiar_mark', 'pirate_bay', 'broken_receiver', 'three_echoes', 'blue_hole', 'the_buyer'), pendingDialogs: [] });
  const finished = { ...save.quests, ...done('beyond_reef') };
  const next = settle(save, finished).save;
  assert.equal(next.storyChapter, 1);
  assert.equal(next.reputation.institute, CAMPAIGN_REPUTATION);
  assert.ok(next.pendingDialogs.includes(PORT_INTRO));
  assert.ok(next.flags.includes(PORT_INTRO));
  const again = settle(next, next.quests).save;
  assert.equal(again.pendingDialogs.filter((d) => d === PORT_INTRO).length, next.pendingDialogs.filter((d) => d === PORT_INTRO).length);
});

test('rozehraný save po Karibiku dostane úvod přístavu jednou, save s rozšířením jen příznak', () => {
  const midArctic = migrateSave({ ...DEFAULT_SAVE, storyChapter: 1, pendingDialogs: [], flags: [] });
  assert.deepEqual(midArctic.pendingDialogs, [PORT_INTRO]);
  assert.deepEqual(migrateSave(midArctic).pendingDialogs, [PORT_INTRO]);
  const expansion = migrateSave({ ...DEFAULT_SAVE, storyChapter: 8, pendingDialogs: [], flags: ['expansion'] });
  assert.ok(expansion.flags.includes(PORT_INTRO));
  assert.deepEqual(expansion.pendingDialogs, []);
});

test('Dílna v přístavu: materiály z Arktidy a první výrobek', () => {
  const save = saveWith({ storyChapter: 1, oceans: ['caribbean', 'arctic'], quests: done('first_dive'), money: 1000 });
  const dived = applyDive(save, { ...emptyResult('arctic'), materials: { scrap: 2, rope: 1 } }).save;
  assert.ok(dived.quests.port_workshop.flags.includes('port_workshop#0'));
  assert.equal(dived.quests.port_workshop.done, false);
  const crafted = craft(dived, 'canister')!;
  const settled = settle(crafted, crafted.quests).save;
  assert.equal(settled.quests.port_workshop.done, true);
});
