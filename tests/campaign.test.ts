import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, step } from '../src/game/engine';
import { OCEANS, type OceanId } from '../src/game/oceans';
import { startDive, triggerSonar } from '../src/game/systems/dive';
import type { DiveResult, GameState, Input } from '../src/game/types';
import { addReputation, FACTION_IDS } from '../src/progression/factions';
import { applyChoice, applyDive, applyEnding, applyTideEnding, choiceAvailable, resettle } from '../src/progression/progress';
import { activeQuests, chapterOf, itemX, pendingChoice, QUESTS, stepKey, type QuestDef } from '../src/progression/quests';
import { canResearch, RESEARCH } from '../src/progression/research';
import { DEFAULT_SAVE, migrateSave, type SaveData } from '../src/progression/saveData';
import { endingAvailable } from '../src/progression/story';
import { craft } from '../src/progression/tides';
import { EMPTY_LEVELS, statsFor } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

function run(state: GameState, seconds: number, policy: (s: GameState) => Input): DiveResult | null {
  for (let t = 0; t < seconds; t += DT) {
    const events = step(state, policy(state), DT, VIEW);
    const finished = events.find((e) => e.type === 'finished');
    if (finished && finished.type === 'finished') return finished.result;
  }
  return null;
}

const empty: Partial<Record<OceanId, DiveResult>> = {};

function emptyResult(ocean: OceanId): DiveResult {
  if (!empty[ocean]) {
    const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean, seed: 3 });
    startDive(state);
    state.diver.health = 0;
    empty[ocean] = { ...run(state, 10, () => ({ x: 0, y: 0 }))!, success: true };
  }
  return { ...empty[ocean]! };
}

const EMPTY_STATE = { done: false, progress: 0, flags: [] as string[] };

function playthrough(prefer: 'flags' | 'last'): { save: SaveData; stuck: string[] } {
  let save = migrateSave({ ...DEFAULT_SAVE });
  const stuck: string[] = [];
  const keys = (q: QuestDef, s: number, n: number) => Array.from({ length: n }, (_, i) => `${q.id}:${s}:${i}`);
  const resultFor = (q: QuestDef): DiveResult => {
    const flags = save.quests[q.id]?.flags ?? [];
    const res: DiveResult = { ...emptyResult(q.ocean), delivered: [], activated: [], photos: [], cut: 0, bossLoot: false, chests: [], regionMax: 5, gates: 0, scans: [], escapes: 0, heavy: 0, materials: {} };
    q.steps.forEach((g, s) => {
      if (flags.includes(stepKey(q.id, s))) return;
      if (g.kind === 'deliver') res.delivered.push(...keys(q, s, g.items.length));
      if (g.kind === 'activate') {
        res.activated.push(...keys(q, s, g.items.length));
        if (g.vault) res.delivered.push(`${q.id}:${s}:vault`);
      }
      if (g.kind === 'photo') res.photos.push({ species: g.species === 'fish' ? 'fish_blue' : g.species, stars: 3 });
      if (g.kind === 'cut') res.cut = g.count;
      if (g.kind === 'boss') res.bossLoot = true;
      if (g.kind === 'chests') res.chests = Array.from({ length: g.count }, (_, i) => ({ id: `c${i}`, kind: 'common', value: 50, regionId: 1, relic: null, boss: false, weight: 1 }));
      if (g.kind === 'tide') res.gates = g.count;
      if (g.kind === 'drone') res.scans = Array.from({ length: g.count }, (_, i) => `scan${i}`);
      if (g.kind === 'escape') res.escapes = 1;
      if (g.kind === 'heavy') res.heavy = g.count;
      if (g.kind === 'materials') res.materials = { scrap: g.count };
    });
    return res;
  };
  const meta = (q: QuestDef) => {
    for (const g of q.steps) {
      if (g.kind === 'reputation') {
        for (const f of g.faction ? [g.faction] : FACTION_IDS.slice(0, g.factions ?? 1)) {
          if (save.reputation[f] < g.points) save = { ...save, reputation: addReputation(save.reputation, f, g.points - save.reputation[f]) };
        }
      }
      if (g.kind === 'craft' && save.crafted.length === 0) save = craft({ ...save, materials: { scrap: 5, rope: 5 } }, 'canister') ?? save;
      for (let k = 0; g.kind === 'rifts' && k < 40 && save.rifts.closed < g.count; k++) {
        const rift = save.rifts.active[0];
        save = applyDive(save, rift ? { ...emptyResult(rift.ocean), delivered: [`rift:${rift.id}`] } : emptyResult('caribbean')).save;
      }
    }
    save = resettle(save);
  };
  const tries: Record<string, number> = {};
  for (let i = 0; i < 600; i++) {
    for (const def of RESEARCH) {
      if (!save.research.includes(def.id) && canResearch(def, save.research, save.researchData)) save = { ...save, researchData: save.researchData - def.cost, research: [...save.research, def.id] };
    }
    const active = activeQuests(save.quests, save.oceans, save.flags);
    const choice = active.find((q) => q.choice && pendingChoice(q, save.quests[q.id] ?? EMPTY_STATE) >= 0);
    if (choice) {
      const options = choice.choice!.options.filter((o) => choiceAvailable(save, o.needsFlag) && (o.money ?? 0) >= -save.money);
      const pick = prefer === 'last' ? options[options.length - 1] : (options.find((o) => o.flag) ?? options[0]);
      const settled = pick ? applyChoice(save, choice.id, pick.id) : null;
      if (!settled) {
        stuck.push(`volba ${choice.id}`);
        break;
      }
      save = settled.save;
      continue;
    }
    const open = active.filter((q) => !q.choice || pendingChoice(q, save.quests[q.id] ?? EMPTY_STATE) < 0);
    const quest = [...open.filter((q) => q.category !== 'main'), ...open][0];
    if (!quest) {
      if (!save.ending && save.storyChapter >= 8) {
        const ending = (['guardian', 'hidden', 'power', 'sacrifice'] as const).find((e) => endingAvailable(e, save))!;
        save = resettle(applyEnding(save, ending)!);
        continue;
      }
      if (save.tideChapter >= 13 && !save.tideEnding) save = applyTideEnding(save, 'sleep')!;
      break;
    }
    tries[quest.id] = (tries[quest.id] ?? 0) + 1;
    if (tries[quest.id] > 4) {
      stuck.push(quest.id);
      save = { ...save, quests: { ...save.quests, [quest.id]: { done: true, progress: 0, flags: [] } } };
      continue;
    }
    meta(quest);
    if (!save.quests[quest.id]?.done) save = applyDive(save, resultFor(quest)).save;
  }
  return { save, stuck };
}

test('celá kampaň i rozšíření jdou dohrát a každý quest jde splnit', () => {
  const best = playthrough('flags');
  assert.deepEqual(best.stuck, []);
  assert.deepEqual(QUESTS.filter((q) => !best.save.quests[q.id]?.done).map((q) => q.id), []);
  assert.equal(best.save.ending, 'guardian', 'konec Strážci oceánu jde splnit');
  assert.equal(best.save.storyChapter, 8);
  assert.equal(best.save.tideChapter, 13);
  assert.ok(best.save.oceans.includes('riptide') && best.save.oceans.includes('wandering'));
  const other = playthrough('last');
  assert.deepEqual(other.stuck, []);
  assert.deepEqual(QUESTS.filter((q) => !other.save.quests[q.id]?.done).map((q) => q.id), ['rook_final'], 'bez spojenectví s Rookem chybí jen jeho finále');
  assert.ok(other.save.ending);
});

test('ke každému questovému předmětu kampaně jde s doporučenou výbavou doplout a vrátit se', () => {
  const fails: string[] = [];
  for (const quest of QUESTS.filter((q) => !q.chapter)) {
    const chapter = chapterOf(quest);
    const ocean = OCEANS[quest.ocean];
    quest.steps.forEach((goal, s) => {
      if (goal.kind !== 'deliver' && goal.kind !== 'activate') return;
      goal.items.forEach((item, i) => {
        const id = `${quest.id}:${s}:${i}`;
        const levels = { ...EMPTY_LEVELS, sonar: 1, tank: Math.min(6, 2 + chapter), fins: Math.min(5, 1 + chapter), pressure: ocean.recommended.pressure, thermal: ocean.recommended.thermal, light: ocean.recommended.light, cutter: ocean.recommended.cutter };
        const props = [{ id, kind: goal.prop, x: itemX(quest.ocean, item), lift: item.lift ?? 24, quest: quest.id, sprite: item.sprite ?? null, active: false, value: 0 }];
        const state = createGame(statsFor(levels), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, ocean: quest.ocean, props, seed: 2, condition: 'normal' });
        const target = state.props.find((p) => p.id === id)!;
        state.boat.x = target.x - 160;
        startDive(state);
        let tick = 0;
        const result = run(state, 300, (st) => {
          st.sharks = [];
          st.hazards = [];
          st.currents = [];
          const near = Math.hypot(st.diver.x - target.x, st.diver.y - target.y) < 120;
          if (goal.kind === 'activate' && near && tick++ % 60 === 0) triggerSonar(st);
          const back = st.diver.cargo.length > 0 || (goal.kind === 'activate' && st.record.activated.includes(id));
          const to = back ? { x: st.boat.x, y: 10 } : target;
          const dx = to.x - st.diver.x;
          const dy = to.y - st.diver.y;
          const len = Math.hypot(dx, dy) || 1;
          return { x: dx / len, y: dy / len };
        });
        const ok = result?.success && (goal.kind === 'deliver' ? result.delivered : result.activated).includes(id);
        if (!ok) fails.push(`${id} (${Math.round(target.y / 10)} m): ${result ? `${result.reason ?? 'bez doručení'}, kyslík ${result.oxygenLeftPct} %` : 'nestihl'}`);
      });
    });
  }
  assert.deepEqual(fails, []);
});
