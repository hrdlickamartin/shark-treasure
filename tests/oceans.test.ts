import assert from 'node:assert/strict';
import { photoMessage } from '../src/progression/encyclopedia';
import { test } from 'node:test';
import { createGame, step, type WorldOptions } from '../src/game/engine';
import { OCEAN_ORDER, OCEANS, oceanEnd, type OceanId } from '../src/game/oceans';
import { startDive } from '../src/game/systems/dive';
import { startBoatEvent } from '../src/game/systems/events';
import { takePhoto } from '../src/game/systems/extras';
import type { DiveResult, GameState, Input } from '../src/game/types';
import { floorAt } from '../src/game/terrain';
import { generateChunk, newShark } from '../src/game/world';
import { applyDive } from '../src/progression/progress';
import { applyChoice } from '../src/progression/progress';
import { chapterEndFor, currentObjective, itemX, objectiveHowTo, questProps, QUESTS, type QuestState } from '../src/progression/quests';
import { dialogueFor } from '../src/progression/dialogue';
import { endingAvailable } from '../src/progression/story';
import { DEFAULT_SAVE, migrateSave, type SaveData } from '../src/progression/saveData';
import { EMPTY_LEVELS, statsFor, type UpgradeLevels } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

function world(ocean: OceanId, levels: Partial<UpgradeLevels> = {}, extra: Partial<WorldOptions> = {}): GameState {
  return createGame(statsFor({ ...EMPTY_LEVELS, ...levels }), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, ...extra });
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

function saveWith(patch: Partial<SaveData>): SaveData {
  return migrateSave({ ...DEFAULT_SAVE, ...patch });
}

function done(...ids: string[]): Record<string, QuestState> {
  return Object.fromEntries(ids.map((id) => [id, { done: true, progress: 0, flags: QUESTS.find((q) => q.id === id)!.steps.map((_, i) => `${id}#${i}`) }]));
}

const CARIBBEAN_CHAIN = ['first_dive', 'familiar_mark', 'pirate_bay', 'broken_receiver', 'three_echoes', 'blue_hole', 'the_buyer'];

test('každý oceán vygeneruje celou mapu s vlastními lokacemi a bossem', () => {
  for (const id of OCEAN_ORDER) {
    const ocean = OCEANS[id];
    const state = world(id);
    assert.ok(ocean.regions.length >= 5, `${id}: málo lokací`);
    for (let i = -Math.ceil(oceanEnd(ocean) / 480); i <= Math.ceil(oceanEnd(ocean) / 480); i++) generateChunk(state, i);
    if (ocean.bossRegion !== null) assert.ok(state.sharks.some((s) => s.kind === ocean.boss), `${id}: chybí boss ${ocean.boss}`);
    if (ocean.temperature) assert.ok(state.props.some((p) => p.kind === 'beacon'), `${id}: chybí majáky`);
  }
});

test('chlad v Arktidě ubírá teplotu, maják ji vrací a termooblek ztrátu zpomalí', () => {
  const measure = (thermal: number) => {
    const state = world('arctic', { thermal, tank: 6 });
    startDive(state);
    state.props = [];
    run(state, 1, () => ({ x: 0, y: 1 }));
    calm(state);
    const before = state.diver.temp;
    run(state, 5, () => ({ x: 0, y: 0 }));
    return before - state.diver.temp;
  };
  const bare = measure(0);
  const suited = measure(3);
  assert.ok(bare > 5, `teplota klesla jen o ${bare}`);
  assert.ok(suited < bare * 0.6, `termooblek nepomáhá (${suited} vs ${bare})`);
  const state = world('arctic', { tank: 6 });
  startDive(state);
  run(state, 1, () => ({ x: 0, y: 1 }));
  calm(state);
  state.diver.temp = 0;
  const health = state.diver.health;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.health < health, 'v mrazu má ubývat zdraví');
  state.props.push({ id: 'b', kind: 'beacon', x: state.diver.x, y: state.diver.y, lift: 0, quest: null, sprite: null, active: true, value: 0, taken: false, progress: 0, phase: 0 });
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.temp > 20, 'u majáku se má potápěč ohřát');
});

test('tlak pod bezpečnou hloubkou zraňuje a tlakový oblek ho posune níž', () => {
  const hurt = (pressure: number) => {
    const state = world('abyss', { pressure, tank: 6 });
    startDive(state);
    calm(state);
    state.diver.x = 2400;
    state.diver.y = 1400;
    state.diver.invuln = 99;
    run(state, 1, (s) => (calm(s), { x: 0, y: 0 }));
    return 100 - state.diver.health;
  };
  assert.ok(hurt(0) > 5);
  assert.equal(hurt(5), 0);
});

test('záchranný quest: trosečníka je potřeba dovézt na loď', () => {
  const save = saveWith({ quests: done('first_dive') });
  const props = questProps(save.quests, save.oceans, save.flags, 'caribbean');
  const survivor = props.find((p) => p.quest === 'car_rescue');
  assert.ok(survivor);
  const state = world('caribbean', { tank: 6, fins: 3 }, { props });
  state.boat.x = survivor.x - 200;
  startDive(state);
  const target = state.props.find((p) => p.id === survivor.id)!;
  const result = run(state, 120, (s) => (calm(s), toward(s.diver, s.diver.cargo.includes(target.id) ? { x: s.boat.x, y: 10 } : target)));
  assert.ok(result?.success);
  assert.ok(result.delivered.includes(target.id));
  const { save: next, summary } = applyDive(save, result);
  assert.ok(summary.quests.some((q) => q.id === 'car_rescue'));
  assert.equal(next.quests.car_rescue.done, true);
  assert.equal(next.money, save.money + result.total + summary.missionReward + summary.questReward + summary.levelReward);
});

test('starověký zámek: páky se pamatují mezi ponory a otevřou klenotnici', () => {
  let save = saveWith({ oceans: ['caribbean', 'arctic', 'mediterranean'], storyChapter: 2, quests: done('idris_inscriptions') });
  const props = questProps(save.quests, save.oceans, save.flags, 'mediterranean');
  const levers = props.filter((p) => p.kind === 'lever');
  assert.equal(levers.length, 4);
  const state = world('mediterranean', {}, { props });
  startDive(state);
  for (const lever of state.props.filter((p) => p.kind === 'lever').slice(0, 2)) {
    state.diver.x = lever.x;
    state.diver.y = lever.y;
    run(state, 0.05, (s) => (calm(s), { x: 0, y: 0 }));
  }
  state.diver.health = 0;
  const failed = run(state, 10, () => ({ x: 0, y: 0 }))!;
  assert.equal(failed.success, false);
  save = applyDive(save, failed).save;
  assert.equal(save.quests.med_lock.flags.filter((f) => /^med_lock:0:\d$/.test(f)).length, 2);
  const again = world('mediterranean', {}, { props: questProps(save.quests, save.oceans, save.flags, 'mediterranean') });
  startDive(again);
  assert.equal(again.props.filter((p) => p.kind === 'lever' && p.active).length, 2);
  const vault = again.props.find((p) => p.kind === 'vault')!;
  assert.equal(vault.active, false);
  for (const lever of again.props.filter((p) => p.kind === 'lever' && !p.active)) {
    again.diver.x = lever.x;
    again.diver.y = lever.y;
    run(again, 0.05, (s) => (calm(s), { x: 0, y: 0 }));
  }
  assert.equal(vault.active, true, 'po všech pákách se klenotnice otevře');
});

test('fotka tvora se zapíše do katalogu a přinese výzkum', () => {
  const state = world('caribbean', { camera: 1 });
  startDive(state);
  run(state, 1, (s) => (calm(s), { x: 0, y: 1 }));
  state.diver.facing = 1;
  state.sharks = [newShark('t', 'reef', state.diver.x + 60, state.diver.y, 100, false, 0)];
  takePhoto(state);
  assert.deepEqual(state.record.photos, [{ species: 'reef', stars: 3 }]);
  state.diver.health = 0;
  const result = run(state, 10, (s) => (calm(s), { x: 0, y: 0 }))!;
  const { save, summary } = applyDive(saveWith({}), result);
  assert.equal(save.encyclopedia.reef, 3);
  assert.ok(summary.research > 0);
});

test('hlavní kapitola odemkne další oceán a poslední spustí volbu konce', () => {
  const base = saveWith({ quests: done(...CARIBBEAN_CHAIN) });
  const result = { ...fakeResult('caribbean'), delivered: ['beyond_reef:0:0'] };
  const { save, summary } = applyDive(base, result);
  assert.equal(save.storyChapter, 1);
  assert.deepEqual(summary.unlocked, ['arctic']);
  assert.ok(save.pendingDialogs.includes('debrief:beyond_reef'));
  assert.ok(save.pendingDialogs.includes('hook_0'));
  const last = saveWith({ storyChapter: OCEAN_ORDER.length - 1, oceans: [...OCEAN_ORDER] });
  const end = applyDive(last, { ...fakeResult('volcanic'), delivered: ['heart_ocean:0:0'] });
  assert.equal(end.summary.ending, true);
});

test('řezák otevře zapečetěnou truhlu, bez něj zůstane zavřená', () => {
  const cut = (cutter: number) => {
    const state = world('graveyard', { cutter, tank: 6, pressure: 7 });
    startDive(state);
    calm(state);
    for (const chunk of state.chunks.values()) chunk.cave = null;
    const y = floorAt(state, 2400) - 40;
    state.props = [{ id: 's', kind: 'sealed', x: 2400, y, lift: 26, quest: null, sprite: null, active: false, value: 5, taken: false, progress: 0, phase: 0 }];
    state.diver.x = 2400;
    state.diver.y = y;
    run(state, 3, (s) => (calm(s), { x: 0, y: 0 }));
    return state;
  };
  assert.equal(cut(0).props[0].taken, false);
  const opened = cut(1);
  assert.equal(opened.props[0].taken, true);
  assert.ok(opened.record.cut >= 1);
  assert.ok([...opened.chests, ...opened.diver.carried].some((c) => c.id === 's:chest'));
});

test('náhodná událost: ztracený náklad se sebere proplutím lodí', () => {
  const state = world('caribbean');
  startBoatEvent(state, 'cargo');
  const cargo = state.props.find((p) => p.kind === 'cargo')!;
  let value = 0;
  for (let t = 0; t < 12 && !value; t += DT) {
    const events = step(state, { x: Math.sign(cargo.x - state.boat.x), y: 0 }, DT, VIEW);
    for (const e of events) if (e.type === 'cargo') value = e.value;
  }
  assert.ok(value > 0);
});

test('starý save z verze 2 se převede na oceány bez ztráty postupu', () => {
  const save = migrateSave({ version: 2, money: 500, storyChapter: 5, upgrades: { boat: 7 } });
  assert.equal(save.storyChapter, 1);
  assert.deepEqual(save.oceans, ['caribbean', 'arctic']);
  assert.equal(save.ocean, 'caribbean');
  assert.equal(save.money, 500);
  assert.equal(save.upgrades.pressure, 0);
});

test('férovost: s doporučenou výbavou se dá doplout pro fragment každého oceánu a vrátit se', () => {
  OCEAN_ORDER.forEach((id, chapter) => {
    const ocean = OCEANS[id];
    const levels: Partial<UpgradeLevels> = { tank: Math.min(6, 2 + chapter), fins: Math.min(5, 1 + chapter), pressure: ocean.recommended.pressure, thermal: ocean.recommended.thermal, light: ocean.recommended.light };
    const quest = chapterEndFor(chapter);
    assert.ok(quest, `${id}: chybí konec kapitoly`);
    const goal = quest.steps[0];
    assert.equal(goal.kind, 'deliver');
    const items = goal.kind === 'deliver' ? goal.items : [];
    const props = [{ id: `${quest.id}:0:0`, kind: 'fragment' as const, x: itemX(id, items[0]), lift: 24, quest: quest.id, sprite: null, active: false, value: 0 }];
    const state = world(id, levels, { props });
    const fragment = state.props[0];
    state.boat.x = fragment.x - 160;
    startDive(state);
    const result = run(state, 240, (s) => (calm(s), toward(s.diver, s.diver.cargo.length ? { x: s.boat.x, y: 10 } : { x: fragment.x, y: fragment.y })));
    assert.ok(result, `${id}: ponor neskončil`);
    assert.equal(result.success, true, `${id}: nezdar (${result.reason}), zbylo ${result.oxygenLeftPct} % kyslíku`);
    assert.ok(result.delivered.includes(fragment.id), `${id}: fragment nedoručen`);
  });
});

test('každý quest má platné lokace v oceánu', () => {
  for (const quest of QUESTS) {
    const regions = OCEANS[quest.ocean].regions.length;
    for (const goal of quest.steps) {
      const items = goal.kind === 'deliver' ? goal.items : goal.kind === 'activate' ? [...goal.items, ...(goal.vault ? [goal.vault] : [])] : [];
      for (const item of items) assert.ok(item.region < regions, `${quest.id}: lokace ${item.region} neexistuje`);
      if (goal.kind === 'choice') assert.ok(quest.choice, `${quest.id}: volba bez možností`);
    }
    for (const id of quest.requires ?? []) assert.ok(QUESTS.some((q) => q.id === id), `${quest.id}: neznámý požadavek ${id}`);
    if (quest.briefing) assert.ok(dialogueFor(`brief:${quest.id}`));
  }
});

function fakeResult(ocean: OceanId): DiveResult {
  const state = world(ocean);
  startDive(state);
  state.diver.health = 0;
  const result = run(state, 10, () => ({ x: 0, y: 0 }))!;
  return { ...result, success: true };
}

test('First Dive: součástky, fotka ryby a sonarový bod se splní v jednom ponoru', () => {
  const save = saveWith({});
  assert.deepEqual(save.pendingDialogs, ['prologue', 'brief:first_dive']);
  const props = questProps(save.quests, save.oceans, save.flags, 'caribbean');
  const ids = props.filter((p) => p.quest === 'first_dive').map((p) => p.id);
  assert.equal(ids.length, 4);
  const result = { ...fakeResult('caribbean'), delivered: ids.filter((id) => !id.startsWith('first_dive:2')), activated: ['first_dive:2:0'], photos: [{ species: 'fish_clown', stars: 2 }] };
  const { save: next, summary } = applyDive(save, result);
  assert.ok(next.quests.first_dive.done);
  assert.ok(summary.quests.some((q) => q.id === 'first_dive'));
  assert.ok(next.pendingDialogs.includes('debrief:first_dive'));
  assert.ok(QUESTS.filter((q) => q.requires?.includes('first_dive')).every((q) => questProps(next.quests, next.oceans, next.flags, 'caribbean').some((p) => p.quest === q.id) || q.steps.every((g) => g.kind !== 'deliver')));
});

test('samotná fotka ryby splní krok First Dive, souhrn ho ukáže a nápověda přejde na další krok', () => {
  const save = saveWith({});
  const start = currentObjective(save.quests, save.oceans, save.flags, 'caribbean');
  assert.equal(start?.quest.id, 'first_dive');
  assert.equal(start?.goal.kind, 'deliver');
  const parts = questProps(save.quests, save.oceans, save.flags, 'caribbean').filter((p) => p.id.startsWith('first_dive:0:')).map((p) => p.id);
  const afterParts = applyDive(save, { ...fakeResult('caribbean'), delivered: parts }).save;
  assert.equal(currentObjective(afterParts.quests, afterParts.oceans, afterParts.flags, 'caribbean')?.goal.kind, 'photo');
  assert.ok(objectiveHowTo({ kind: 'photo', species: 'fish', label: '' }));
  const { save: next, summary } = applyDive(afterParts, { ...fakeResult('caribbean'), photos: [{ species: 'fish_blue', stars: 3 }] });
  assert.equal(next.quests.first_dive.done, false);
  assert.deepEqual(summary.questSteps.map((st) => [st.label, st.done]), [['Vyfoť rybu pro katalog', 2]]);
  assert.equal(currentObjective(next.quests, next.oceans, next.flags, 'caribbean')?.goal.kind, 'activate');
});

test('volba s diskem nastaví příznak, odměnu a posune příběh', () => {
  const save = saveWith({ quests: done('first_dive', 'familiar_mark', 'pirate_bay', 'broken_receiver', 'three_echoes', 'blue_hole') });
  const settled = applyChoice(save, 'the_buyer', 'sell');
  assert.ok(settled);
  assert.ok(settled.save.flags.includes('sold_disk'));
  assert.equal(settled.save.money, save.money + 3000);
  assert.ok(settled.save.quests.the_buyer.done);
  assert.equal(applyChoice(settled.save, 'the_buyer', 'hide'), null, 'volbu nejde opakovat');
});

test('Rookova dohoda vyžaduje respekt, Strážci oceánu činy celé hry', () => {
  const base = saveWith({ oceans: ['caribbean', 'arctic', 'mediterranean'], storyChapter: 2, quests: done('idris_inscriptions', 'rook_map') });
  assert.equal(applyChoice(base, 'rook_deal', 'respect'), null);
  const respected = applyChoice({ ...base, flags: ['rook_respect', 'rook_saved'] }, 'rook_deal', 'respect');
  assert.ok(respected?.save.flags.includes('rook_ally'));
  const end = saveWith({ storyChapter: 8, oceans: [...OCEAN_ORDER] });
  assert.equal(endingAvailable('guardian', end), false);
  assert.equal(endingAvailable('hidden', end), true);
  const sides = QUESTS.filter((q) => q.category !== 'main').slice(0, 8).map((q) => q.id);
  const hero = { ...end, flags: ['diego_saved'], research: ['lungs', 'hydro', 'nets', 'alloy', 'lining'], quests: done(...sides) };
  assert.equal(endingAvailable('guardian', hero), true);
});

test('save z verze 3 převede hotové kapitoly a starý konec', () => {
  const save = migrateSave({ version: 3, storyChapter: 2, oceans: ['caribbean', 'arctic', 'mediterranean'], ending: 'share', quests: { car_rescue: { done: true, progress: 1, flags: [] } } });
  assert.ok(save.quests.beyond_reef.done);
  assert.ok(save.quests.frozen_secrets.done);
  assert.ok(save.quests.car_rescue.done);
  assert.ok(!save.quests.ancient_med?.done);
  assert.equal(save.ending, 'guardian');
  assert.deepEqual(save.pendingDialogs, ['intro_existing', 'tide_intro_guardian', 'brief:tide_echo']);
  assert.ok(save.flags.includes('expansion'));
  assert.ok(questProps(save.quests, save.oceans, save.flags, 'mediterranean').some((p) => p.quest === 'idris_inscriptions'));
});

test('zpráva o fotce řekne, jestli je druh nový, lepší, nebo už nafocený', () => {
  assert.match(photoMessage({}, 'fish_clown', 2, 0, 'First Dive'), /Nový druh: Klaun očkatý \(2\/3\).*\+5 dat.*Úkol: First Dive/);
  assert.match(photoMessage({ fish_clown: 1 }, 'fish_clown', 3, 0, null), /Lepší fotka.*1\/3 → 3\/3/);
  assert.match(photoMessage({ fish_clown: 3 }, 'fish_clown', 2, 0, null), /už máš 3\/3/);
  assert.match(photoMessage({}, 'fish_clown', 1, 2, null), /už máš 2\/3/);
  assert.match(photoMessage({}, '', 0, 0, null), /prázdná/);
});
