import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, step } from '../src/game/engine';
import { startDive } from '../src/game/systems/dive';
import type { DiveResult, GameState, Input } from '../src/game/types';
import { ensureChunks, generateChunk } from '../src/game/world';
import { EMPTY_LEVELS, statsFor } from '../src/progression/upgrades';

const VIEW = { width: 900, height: 420 };
const DT = 1 / 60;

function newDive(): GameState {
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW);
  startDive(state);
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

function toward(from: { x: number; y: number }, to: { x: number; y: number }): Input {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

test('první ponor: truhlice u lodi jde s výchozí nádrží přinést s rezervou kyslíku', () => {
  const state = newDive();
  const chest = state.chests.find((c) => c.id.startsWith('1:'));
  assert.ok(chest, 'první úsek musí mít garantovanou truhlici');
  assert.equal(chest.kind, 'common');
  assert.equal(state.sharks.filter((s) => Math.abs(s.x) < 1500).length, 0, 'u startu nesmí být žraloci');
  const result = run(state, 60, (s) =>
    toward(s.diver, s.diver.carried.length ? { x: s.boat.x, y: 10 } : chest),
  );
  assert.ok(result, 'ponor musí skončit doručením');
  assert.equal(result.success, true);
  assert.equal(result.chests.length, 1);
  assert.ok(result.oxygenLeftPct >= 30, `zbylo jen ${result.oxygenLeftPct} % kyslíku`);
  assert.ok(result.total > 0);
});

test('došlý kyslík ukončí ponor neúspěchem bez výplaty', () => {
  const state = newDive();
  const result = run(state, 200, () => ({ x: 0, y: 1 }));
  assert.ok(result);
  assert.equal(result.success, false);
  assert.equal(result.reason, 'oxygen');
  assert.equal(result.total, 0);
});

test('útok žraloka shodí nesenou truhlici a ta nejde okamžitě sebrat zpět', () => {
  let drops = 0;
  let attempts = 0;
  for (let i = 0; i < 10; i++) {
    const state = newDive();
    ensureChunks(state, 5000, 1200);
    const hunter = state.sharks.find((s) => s.hunter && Math.abs(s.x) > 4000);
    if (!hunter) continue;
    attempts++;
    state.stats.oxygenMax = 999;
    state.diver.oxygen = 999;
    state.diver.x = hunter.x + 150;
    state.diver.y = hunter.y;
    state.diver.carried = [{ id: 'test', kind: 'rare', value: 300, weight: 1.3, regionId: 2 }];
    hunter.facing = 1;
    run(state, 12, () => ({ x: 0, y: 0 }));
    if (state.record.hits > 0 && state.diver.carried.length === 0) drops++;
  }
  assert.ok(attempts > 0, 'v oblasti Shark Territory se nenašel lovící žralok');
  assert.ok(drops > 0, 'žádný zásah neshodil truhlici');
});

test('generování úseků je deterministické i pro záporné indexy', () => {
  const a = createGame(statsFor(EMPTY_LEVELS), VIEW);
  const b = createGame(statsFor(EMPTY_LEVELS), VIEW);
  b.seed = a.seed;
  for (const index of [-7, -1, 3, 12]) {
    const ca = generateChunk(a, index);
    const cb = generateChunk(b, index);
    assert.deepEqual(ca.profile, cb.profile);
    assert.deepEqual(
      ca.decor.map((d) => [d.sprite, d.x]),
      cb.decor.map((d) => [d.sprite, d.x]),
    );
  }
});
