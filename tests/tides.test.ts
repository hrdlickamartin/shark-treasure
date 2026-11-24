import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, step, type WorldOptions } from '../src/game/engine';
import { OCEAN_ORDER, OCEANS, type OceanId } from '../src/game/oceans';
import { CHESTS } from '../src/game/catalog';
import { CHUNK_W } from '../src/game/constants';
import { startDive } from '../src/game/systems/dive';
import { firePip } from '../src/game/systems/drone';
import { COLLAPSE_TIME, escapeDistance } from '../src/game/systems/collapse';
import { fireHarpoon, launchBalloon } from '../src/game/systems/extras';
import { applyKit } from '../src/game/systems/kit';
import { GATE_LEVER_TIME, tideInfo } from '../src/game/systems/tide';
import { RIFT_RADIUS } from '../src/game/systems/props';
import { floorAt } from '../src/game/terrain';
import type { Chest, DiveResult, GameState, Input, Prop } from '../src/game/types';
import { generateChunk, materialProp, newHazard, newShark } from '../src/game/world';
import { applyChoice, applyDive, choiceAvailable } from '../src/progression/progress';
import { addReputation, contractsFor, EMPTY_REPUTATION, tierOf } from '../src/progression/factions';
import { QUESTS, type QuestState } from '../src/progression/quests';
import { DEFAULT_SAVE, migrateSave, type SaveData } from '../src/progression/saveData';
import { buyModule, claimContract, craft, equipMod, handOverShard, riftProps, tickRifts } from '../src/progression/tides';
import { EMPTY_LEVELS, statsFor, type Meta, type UpgradeLevels } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

const SEED = Number(process.env.TIDE_SEED ?? 424242);

function world(ocean: OceanId, levels: Partial<UpgradeLevels> = {}, extra: Partial<WorldOptions> = {}, meta?: Meta): GameState {
  return createGame(statsFor({ ...EMPTY_LEVELS, ...levels }, [], null, meta), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, expansion: true, seed: SEED, ...extra });
}

function run(state: GameState, seconds: number, policy: (s: GameState) => Input): DiveResult | null {
  for (let t = 0; t < seconds; t += DT) {
    const events = step(state, policy(state), DT, VIEW);
    const finished = events.find((e) => e.type === 'finished');
    if (finished && finished.type === 'finished') return finished.result;
  }
  return null;
}

function toward(from: { x: number; y: number }, to: { x: number; y: number }): Input {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function calm(s: GameState) {
  s.sharks = [];
  s.hazards = [];
  s.currents = [];
}

function diveAt(state: GameState, x: number) {
  state.boat.x = x;
  startDive(state);
  run(state, 0.5, (s) => (calm(s), { x: 0, y: 1 }));
}

function chestAt(state: GameState, id: string, x: number, kind: Chest['kind'] = 'common'): Chest {
  const restY = floorAt(state, x) - CHESTS[kind].width * 0.32;
  const chest: Chest = { id, kind, x, y: restY, restY, value: 500, regionId: 1, falling: false, vy: 0, phase: 0, pickupDelay: 0, boss: false, inCave: false, relic: null, rolled: true };
  state.chests.push(chest);
  return chest;
}

function saveWith(patch: Partial<SaveData>): SaveData {
  return migrateSave({ ...DEFAULT_SAVE, ...patch });
}

function done(...ids: string[]): Record<string, QuestState> {
  return Object.fromEntries(ids.map((id) => [id, { done: true, progress: 0, flags: QUESTS.find((q) => q.id === id)!.steps.map((_, i) => `${id}#${i}`) }]));
}

test('příliv se v úžině střídá s odlivem, zeslabí proud a otočí ho', () => {
  const state = world('riptide');
  const high = tideInfo(state);
  assert.equal(high.active, true);
  assert.equal(high.high, true);
  state.time = OCEANS.riptide.tide!.period / 2 + 1;
  const low = tideInfo(state);
  assert.equal(low.high, false);
  assert.equal(low.sign, -1);
  assert.ok(low.factor < high.factor);
  const slow = world('riptide', {}, { tideScale: 1.5 });
  slow.time = OCEANS.riptide.tide!.period / 2 + 1;
  assert.equal(tideInfo(slow).high, true, 'pomalejší příliv má delší cyklus');
});

test('přílivový proud unáší potápěče jedním směrem a za odlivu opačným', () => {
  const state = world('riptide');
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  state.currents = [{ id: 'c', x0: diver.x - 2000, x1: diver.x + 2000, y0: diver.y - 200, y1: diver.y + 200, force: 120, lift: 0, tidal: true }];
  state.time = 1;
  const startX = diver.x;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(diver.x > startX + 50, 'při přílivu proud táhne doprava');
  state.time = OCEANS.riptide.tide!.period / 2 + 1;
  const lowX = diver.x;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(diver.x < lowX - 20, 'za odlivu proud táhne doleva');
});

test('zavřená brána nepustí potápěče, páka ji otevře na 20 s a průjezd se započítá', () => {
  const state = world('riptide');
  diveAt(state, 3600);
  calm(state);
  const { diver } = state;
  const gateX = diver.x + 140;
  const floor = floorAt(state, gateX);
  const gate: Prop = { id: 'g', kind: 'gate', x: gateX, y: floor, lift: 0, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: 'gate' };
  const lever: Prop = { id: 'g:lever', kind: 'lever', x: diver.x - 60, y: diver.y, lift: 0, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: 'gate:g' };
  state.props.push(gate, lever);
  diver.y = floor - 80;
  state.time = OCEANS.riptide.tide!.period / 2 + 0.5;
  run(state, 2.5, () => ({ x: 1, y: 0 }));
  assert.ok(diver.x < gateX, 'zavřená brána blokuje');
  diver.x = lever.x;
  diver.y = lever.y;
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  assert.ok(gate.progress > GATE_LEVER_TIME - 1, 'páka otevřela bránu');
  diver.y = floor - 80;
  run(state, 3, () => ({ x: 1, y: 0 }));
  assert.ok(diver.x > gateX, 'otevřenou branou se dá proplout');
  assert.equal(state.record.gates, 1);
});

test('Pip vyletí, odhalí mimikry, donese materiál a vrátí se s ním', () => {
  const state = world('wandering', { drone: 2 });
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  diver.facing = 1;
  const x = diver.x + 260;
  state.props.push(materialProp(state, 'm', x, 'nacre', 2));
  state.props[state.props.length - 1].y = diver.y;
  state.hazards.push(newHazard('mimic', 'mimic', x + 40, diver.y, {}));
  firePip(state);
  assert.equal(state.drone.mode, 'out');
  run(state, 6, () => ({ x: 0, y: 0 }));
  assert.equal(state.hazards[0].state, 1, 'mimikry je odhalená');
  assert.equal(state.drone.mode, 'dock');
  assert.ok(state.drone.cooldown > 0);
  assert.equal(state.record.materials.nacre, 2);
});

test('žralok Pipa vyřadí, ale dron se po chvíli vrátí', () => {
  const state = world('wandering', { drone: 1 });
  diveAt(state, 2000);
  calm(state);
  state.diver.facing = 1;
  firePip(state);
  run(state, 0.4, () => ({ x: 0, y: 0 }));
  state.sharks = [newShark('s', 'reef', state.drone.x, state.drone.y, 10, false, 0)];
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.equal(state.drone.mode, 'off');
  state.sharks = [];
  run(state, 6, () => ({ x: 0, y: 0 }));
  assert.equal(state.drone.mode, 'dock');
});

function unstableCave(state: GameState): { index: number; chest: Chest } {
  for (let index = 4; index < 40; index++) {
    const chunk = generateChunk(state, index);
    state.chunks.set(index, chunk);
    const chest = state.chests.find((c) => c.id === `${index}:cave`);
    if (chunk.cave?.unstable && chest) return { index, chest };
  }
  throw new Error('nenalezena nestabilní jeskyně');
}

test('truhla z nestabilní jeskyně spustí kolaps a kdo zůstane uvnitř, je zavalen', () => {
  const state = world('wandering', { tank: 6, pressure: 5 });
  const { index, chest } = unstableCave(state);
  diveAt(state, chest.x);
  calm(state);
  state.diver.x = chest.x;
  state.diver.y = chest.y;
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  assert.ok(state.collapse, 'kolaps začal');
  assert.equal(state.collapse!.index, index);
  const result = run(state, COLLAPSE_TIME + 6, (s) => (s.diver.oxygen = s.stats.oxygenMax, { x: 0, y: 0 }));
  assert.ok(result);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'collapse');
  assert.equal(state.chunks.get(index)!.cave!.collapsed, true);
});

test('z hroutící se jeskyně se dá uniknout a únik se započítá', () => {
  const state = world('wandering', { tank: 6, fins: 3, pressure: 5 });
  const { index, chest } = unstableCave(state);
  diveAt(state, chest.x);
  calm(state);
  state.diver.x = chest.x;
  state.diver.y = chest.y;
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  const cave = state.chunks.get(index)!.cave!;
  const exitX = chest.x - cave.x0 < CHUNK_W / 2 ? cave.x0 - 80 : cave.x1 + 80;
  run(state, COLLAPSE_TIME + 1, (s) => (s.diver.health = 100, toward(s.diver, { x: exitX, y: floorAt(s, exitX) - 40 })));
  assert.equal(state.record.escapes, 1);
});

test('férovost kolapsu: z každé nestabilní jeskyně se dá uniknout v 60 % odpočtu', () => {
  for (const ocean of ['wandering', 'riptide', 'caribbean'] as OceanId[]) {
    const state = world(ocean);
    const speed = statsFor(EMPTY_LEVELS).speed * 0.55;
    for (let index = 4; index < 60; index++) {
      const chunk = generateChunk(state, index);
      const chest = state.chests.find((c) => c.id === `${index}:cave`);
      if (!chunk.cave?.unstable || !chest) continue;
      assert.ok(escapeDistance(chunk, chest.x) / speed < COLLAPSE_TIME * 0.6, `${ocean}:${index}`);
    }
  }
});

test('těžká truhla zabere 2 místa, zpomalí, potřebuje 2 balóny a jeřáb ji vytáhne', () => {
  const state = world('riptide', { balloon: 1, fins: 2 }, {}, { expedition: 0, perks: {}, modules: { stern: 'crane' } });
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  state.chests = [];
  const heavy = chestAt(state, 'h', diver.x + 10, 'heavy');
  diver.y = heavy.y;
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  assert.equal(diver.carried[0]?.kind, 'heavy');
  chestAt(state, 'c', diver.x + 20);
  run(state, 0.3, () => ({ x: 0, y: 0 }));
  assert.equal(diver.carried.length, 1, 'na běžnou truhlu už nezbylo místo');
  launchBalloon(state);
  assert.equal(diver.carried.length, 1, 'jeden balón těžkou truhlu neutáhne');
  diver.x = state.boat.x + 40;
  diver.y = 120;
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.equal(diver.carried.length, 0, 'jeřáb truhlu vytáhl');
  assert.equal(state.balloons[0].chest.kind, 'heavy');
});

test('mimikry chobotnice ukradne mince a uteče, nezraní', () => {
  const state = world('wandering');
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  diver.coins = 100;
  state.hazards.push(newHazard('m', 'mimic', diver.x + 5, diver.y, {}));
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  assert.ok(diver.coins < 100);
  assert.equal(diver.health, 100);
  run(state, 2, () => ({ x: 0, y: 0 }));
  assert.equal(state.hazards[0].alive, false);
});

test('materiály se doručí s návratem a při nezdaru se polovina ztratí', () => {
  const state = world('caribbean');
  diveAt(state, 3000);
  calm(state);
  state.record.materials = { scrap: 5, rope: 2 };
  state.diver.health = 0;
  const result = run(state, 8, (s) => (calm(s), { x: 0, y: 0 }))!;
  assert.equal(result.success, false);
  assert.deepEqual(result.materials, { scrap: 2, rope: 1 });
  assert.deepEqual(result.materialsLost, { scrap: 3, rope: 1 });
});

test('Vládce proudů je zranitelný jen za odlivu', () => {
  const state = world('riptide', { harpoon: 3 });
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  diver.facing = 1;
  const boss = newShark('b', 'maelstrom', diver.x + 200, diver.y, 300, true, 0);
  boss.homeX = boss.x;
  boss.homeY = boss.y;
  state.sharks = [boss];
  state.time = 1;
  fireHarpoon(state);
  run(state, 0.6, () => ({ x: 0, y: 0 }));
  assert.equal(boss.hp, 3, 'při přílivu se harpuna odrazí');
  state.time = OCEANS.riptide.tide!.period / 2 + 1;
  state.harpoonCooldown = 0;
  diver.x = boss.x - 200;
  diver.y = boss.y;
  fireHarpoon(state);
  run(state, 0.6, () => ({ x: 0, y: 0 }));
  assert.equal(boss.hp, 2, 'za odlivu zásah projde');
});

test('Dutá ulita je neprůstřelná, dokud nejsou přetnuté řetězy', () => {
  const state = world('wandering', { harpoon: 3, cutter: 2 });
  diveAt(state, 2000);
  calm(state);
  const { diver } = state;
  diver.facing = 1;
  const boss = newShark('b', 'hollow', diver.x + 200, diver.y, 100, true, 0);
  state.sharks = [boss];
  const chain: Prop = { id: 'ch', kind: 'chain', x: diver.x - 300, y: diver.y, lift: 0, quest: null, sprite: null, active: false, value: 0, taken: false, progress: 0, phase: 0, tag: 'boss' };
  state.props.push(chain);
  fireHarpoon(state);
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(boss.hp, 4);
  chain.taken = true;
  state.harpoonCooldown = 0;
  diver.x = boss.x - 200;
  diver.y = boss.y;
  fireHarpoon(state);
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(boss.hp, 3);
});

test('v trhlině kyslík ubývá pomaleji a truhly stoupají, až zmizí', () => {
  const plain = world('caribbean');
  diveAt(plain, 3000);
  calm(plain);
  const rifted = world('caribbean');
  diveAt(rifted, 3000);
  calm(rifted);
  const zone: Prop = { id: 'rz', kind: 'rift', x: rifted.diver.x, y: rifted.diver.y, lift: 0, quest: null, sprite: null, active: true, value: 0, taken: false, progress: 0, phase: 0 };
  rifted.props.push(zone);
  const chest = chestAt(rifted, 'fl', rifted.diver.x + 80);
  chest.y = zone.y + 60;
  run(plain, 4, () => ({ x: 0, y: 0 }));
  run(rifted, 4, () => ({ x: 0, y: 0 }));
  assert.ok(rifted.diver.oxygen > plain.diver.oxygen);
  run(rifted, 30, (s) => ((s.diver.oxygen = s.stats.oxygenMax), { x: 0, y: 0 }));
  assert.ok(!rifted.chests.some((c) => c.id === 'fl'), 'truhla zmizela v trhlině');
  assert.ok(RIFT_RADIUS > 0);
});

test('spotřební předměty: patrona doplní kyslík jednou a spotřeba se zapíše', () => {
  const state = world('caribbean', {}, { kit: { canister: 2, anchor: 1 } });
  diveAt(state, 3000);
  calm(state);
  state.diver.oxygen = 10;
  applyKit(state);
  assert.ok(state.diver.oxygen > 10);
  const after = state.diver.oxygen;
  applyKit(state);
  assert.equal(state.diver.oxygen, after, 'druhá patrona se v jednom ponoru nepoužije');
  assert.equal(state.record.kitUsed.canister, 1);
});

test('save verze 4 po konci kampaně odemkne rozšíření a pustí úvod podle konce', () => {
  const save = migrateSave({ ...DEFAULT_SAVE, version: 4, ending: 'power', storyChapter: 8, pendingDialogs: [] });
  assert.ok(save.flags.includes('expansion'));
  assert.equal(save.version, 5);
  assert.deepEqual(save.pendingDialogs, ['tide_intro_power', 'brief:tide_echo']);
  assert.equal(save.tideChapter, 9);
  assert.deepEqual(save.reputation, EMPTY_REPUTATION);
  const fresh = migrateSave({ ...DEFAULT_SAVE, version: 4 });
  assert.ok(!fresh.flags.includes('expansion'));
});

test('výsledek ponoru přidá materiály, odečte použitou výbavu a vyhodnotí zakázky', () => {
  const save = saveWith({ ending: 'guardian', flags: ['expansion'], kit: { flare: 2 } });
  const state = world('caribbean');
  diveAt(state, 3000);
  calm(state);
  state.record.materials = { scrap: 3 };
  state.record.kitUsed = { flare: 1 };
  state.diver.y = 20;
  state.diver.x = state.boat.x;
  const result = run(state, 20, (s) => (calm(s), toward(s.diver, { x: s.boat.x, y: 10 })))!;
  assert.equal(result.success, true);
  const { save: next } = applyDive(save, result);
  assert.equal(next.materials.scrap, 3);
  assert.equal(next.kit.flare, 1);
  assert.ok(next.rifts.active.length > 0, 'po ponoru se otevřou trhliny');
});

test('dílna: recept spotřebuje materiály, modifikace se nasadí a projeví ve statistikách', () => {
  const save = saveWith({ money: 5000, materials: { scrap: 6, ice: 2, rope: 2 } });
  assert.equal(craft(save, 'cooler'), null, 'bez slitiny nejde');
  const made = craft(save, 'reserve')!;
  assert.deepEqual(made.materials, { scrap: 2, rope: 2 });
  assert.equal(made.money, 3500);
  assert.deepEqual(made.mods.equipped, { tank: 'reserve' });
  assert.equal(statsFor(EMPTY_LEVELS, [], null, { expedition: 0, perks: {}, mods: made.mods.equipped }).reserve, true);
  assert.equal(equipMod(made, 'tank', null)!.mods.equipped.tank, undefined);
  assert.equal(craft(saveWith({ materials: { rope: 9, scrap: 9 } }), 'tow'), null, 'recept frakce vyžaduje reputaci');
});

test('modul lodi: frakční modul vyžaduje Důvěryhodnou reputaci a projeví se ve statistikách', () => {
  const rich = saveWith({ money: 20000, materials: { scrap: 10, rope: 10 }, upgrades: { ...EMPTY_LEVELS, boat: 1 } });
  assert.equal(buyModule(rich, 'crane'), null);
  const trusted = { ...rich, reputation: { ...EMPTY_REPUTATION, guild: 400 } };
  const bought = buyModule(trusted, 'crane')!;
  assert.equal(bought.modules.equipped.stern, 'crane');
  assert.equal(bought.money, 20000 - 5400, 'Důvěryhodný u Cechu má 10 % slevu');
  assert.equal(statsFor(EMPTY_LEVELS, [], null, { expedition: 0, perks: {}, modules: bought.modules.equipped }).crane, true);
});

test('frakce: úlomek předaný Institutu přidá reputaci a sebere ji soupeři', () => {
  const save = saveWith({ shards: { pending: 1, total: 1 }, reputation: { ...EMPTY_REPUTATION, tidewatch: 100 } });
  const next = handOverShard(save, 'institute')!;
  assert.equal(next.reputation.institute, 100);
  assert.equal(next.reputation.tidewatch, 60);
  assert.equal(next.researchData, save.researchData + 60);
  assert.equal(handOverShard(next, 'guild'), null);
  assert.equal(tierOf(addReputation(EMPTY_REPUTATION, 'guild', 400).guild), 2);
});

test('materiálová zakázka se odevzdá v přístavu jednou za den', () => {
  const day = '2026-11-24';
  const contract = contractsFor(day).find((c) => c.kind === 'materials');
  if (!contract) return;
  const save = saveWith({ materials: { scrap: 10, rope: 10, biogel: 10, alloy: 5 } });
  const next = claimContract(save, day, contract.id)!;
  assert.ok(next.reputation[contract.faction] > 0);
  assert.equal(claimContract(next, day, contract.id), null);
});

test('trhliny se otevírají podle konce kampaně a uzavřou se doručením úlomku', () => {
  const power = saveWith({ ending: 'power', flags: ['expansion'], oceans: [...OCEAN_ORDER] });
  const rifts = tickRifts(power, []);
  assert.equal(rifts.active.length, 4);
  const sacrifice = tickRifts(saveWith({ ending: 'sacrifice', flags: ['expansion'], oceans: [...OCEAN_ORDER] }), []);
  assert.equal(sacrifice.active.length, 1);
  const withRifts = { ...power, rifts };
  const target = rifts.active[0];
  const props = riftProps(withRifts, target.ocean);
  assert.ok(props.some((p) => p.kind === 'shard' && p.id === `rift:${target.id}`));
  const closed = tickRifts(withRifts, [target.id]);
  assert.equal(closed.closed, 1);
  assert.ok(!closed.active.some((r) => r.id === target.id));
});

test('kapitola 9: Ozvěna dá Pipa a konec kapitoly odemkne Úžinu proudů', () => {
  const save = saveWith({ ending: 'guardian', flags: ['expansion'], tideChapter: 9, oceans: [...OCEAN_ORDER], quests: done('tide_echo', 'tide_pip', 'tide_rift') });
  const quest = QUESTS.find((q) => q.id === 'tide_map')!;
  const goal = quest.steps[0];
  assert.equal(goal.kind, 'activate');
  const state = world('caribbean');
  diveAt(state, 3000);
  calm(state);
  state.record.activated = goal.kind === 'activate' ? goal.items.map((_, i) => `tide_map:0:${i}`) : [];
  state.diver.x = state.boat.x;
  state.diver.y = 20;
  const result = run(state, 20, (s) => (calm(s), toward(s.diver, { x: s.boat.x, y: 10 })))!;
  const { save: next } = applyDive(save, result);
  assert.ok(next.quests.tide_map?.done);
  assert.ok(next.oceans.includes('riptide'));
  assert.equal(next.tideChapter, 10);
  assert.equal(next.storyChapter, save.storyChapter, 'hlavní kampaň se neposune');
});

test('konec Doprovod vyžaduje spojence, ošetřeného Strážce a 6 trhlin', () => {
  const base = saveWith({ flags: ['expansion', 'warden_healed'], rifts: { active: [], closed: 6, seq: 6 } });
  assert.equal(choiceAvailable(base, ['allies3', 'warden_healed', 'rifts6']), false);
  const allies = { ...base, reputation: { guild: 800, institute: 800, brotherhood: 900, tidewatch: 0 } };
  assert.equal(choiceAvailable(allies, ['allies3', 'warden_healed', 'rifts6']), true);
  const quests = done('tide_rifts');
  quests.tide_final = { done: false, progress: 0, flags: ['tide_final#0'] };
  const settled = applyChoice({ ...allies, oceans: [...OCEAN_ORDER, 'riptide', 'wandering'], quests }, 'tide_final', 'escort');
  assert.ok(settled);
  assert.ok(settled.save.flags.includes('tide_end:escort'));
  assert.ok(settled.save.quests.tide_final.done);
});

test('férovost: s doporučenou výbavou se dá v nových oceánech doplout do hlubokých lokací a zpět i za nejhoršího proudu', () => {
  for (const id of ['riptide', 'wandering'] as OceanId[]) {
    const ocean = OCEANS[id];
    const levels: Partial<UpgradeLevels> = { tank: 6, fins: 5, pressure: ocean.recommended.pressure, light: ocean.recommended.light, cutter: ocean.recommended.cutter };
    const state = world(id, levels);
    let target = ocean.regions[4].start + 600;
    for (let k = 0; k < 6; k++) {
      const chunk = generateChunk(state, Math.floor(target / CHUNK_W));
      if (!chunk.cave) break;
      target += CHUNK_W;
    }
    state.boat.x = target - 160;
    startDive(state);
    const goal = { x: target, y: floorAt(state, target) - 40 };
    let reached = false;
    const result = run(state, 300, (s) => {
      s.sharks = [];
      s.hazards = [];
      s.time = ocean.tide!.period / 2 + 1 + (s.time % 1);
      if (Math.hypot(s.diver.x - goal.x, s.diver.y - goal.y) < 50) reached = true;
      return toward(s.diver, reached ? { x: s.boat.x, y: 10 } : goal);
    });
    assert.ok(reached, `${id}: nedoplaval k cíli`);
    assert.ok(result?.success, `${id}: nevrátil se (${result?.reason}, ${result?.oxygenLeftPct} %)`);
  }
});
