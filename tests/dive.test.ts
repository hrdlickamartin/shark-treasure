import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, step } from '../src/game/engine';
import { startDive } from '../src/game/systems/dive';
import type { DiveResult, GameState, Hazard, Input } from '../src/game/types';
import { ensureChunks, generateChunk, newHazard, newShark } from '../src/game/world';
import { shaftWalls, ensureShaft } from '../src/game/endless';
import { SHAFT_ROW_GAP, shaftThreats, CHUNK_THREATS, SEA_COLUMN_GAP } from '../src/game/density';
import { OCEANS } from '../src/game/oceans';
import { regionIndexAt } from '../src/game/regions';
import { damageDiver } from '../src/game/systems/collision';
import { SPIKE_OUT } from '../src/game/systems/creatures';
import { cameraKey, fireHarpoon, fireScooter, healDiver, MEDKIT_HEAL, PHOTO_MODE_TIME } from '../src/game/systems/extras';
import { canEmbark, embarkChapter, embarkEarnings, embarkSave } from '../src/progression/embark';
import { shaftPearls, pearlsFor } from '../src/progression/expedition';
import { CHEST_WEIGHTS, CHESTS } from '../src/game/catalog';
import { DEFAULT_SAVE, migrateSave, type SaveData } from '../src/progression/saveData';
import { EMPTY_LEVELS, maxLevel, statsFor, unlocked, UPGRADES } from '../src/progression/upgrades';

const REGIONS = OCEANS.caribbean.regions;

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
    state.diver.carried = [{ id: 'test', kind: 'rare', value: 300, weight: 1.3, regionId: 2, relic: null, boss: false }];
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

test('u hladiny kyslík neubývá', () => {
  const state = newDive();
  state.sharks = [];
  state.hazards = [];
  state.diver.x = state.boat.x + 500;
  state.diver.oxygen = state.stats.oxygenMax * 0.5;
  run(state, 2, () => ({ x: 0, y: 1 }));
  const before = state.diver.oxygen;
  run(state, 4, () => ({ x: 0, y: -1 }));
  run(state, 5, () => ({ x: 0, y: -0.2 }));
  assert.ok(state.diver.breathing, 'potápěč má být u hladiny');
  assert.ok(state.diver.oxygen >= before - 4, `kyslík u hladiny klesl z ${before} na ${state.diver.oxygen}`);
});

test('násobič chamtivosti roste s počtem doručených truhlic', async () => {
  const { greedMultiplier } = await import('../src/game/systems/dive');
  assert.equal(greedMultiplier(1), 1);
  assert.equal(greedMultiplier(2), 1.25);
  assert.equal(greedMultiplier(3), 1.5);
  assert.equal(greedMultiplier(5), 2);
});

test('balón doručí truhlici, i když potápěč ponor nepřežije', async () => {
  const { launchBalloon } = await import('../src/game/systems/extras');
  const state = newDive();
  state.diver.balloons = 1;
  state.diver.x = state.boat.x + 200;
  state.diver.y = 150;
  state.diver.carried = [{ id: 'b', kind: 'rare', value: 300, weight: 1.3, regionId: 0, relic: null, boss: false }];
  launchBalloon(state);
  assert.equal(state.diver.carried.length, 0);
  assert.equal(state.balloons.length, 1);
  run(state, 5, () => ({ x: 0, y: 0 }));
  assert.ok(state.balloons[0].surfaced, 'balón má vyplavat k hladině');
  state.diver.health = 0;
  const result = run(state, 10, () => ({ x: 0, y: 0 }));
  assert.ok(result);
  assert.equal(result.success, false);
  assert.equal(result.banked.length, 1);
  assert.ok(result.total >= 300);
});

test('jeskyně má strop, kterým potápěč neprojde', async () => {
  const { caveAt } = await import('../src/game/world');
  let tested = false;
  for (let attempt = 0; attempt < 30 && !tested; attempt++) {
    const state = newDive();
    ensureChunks(state, 3000, 3000);
    const chunk = [...state.chunks.values()].find((c) => c.cave);
    if (!chunk || !chunk.cave) continue;
    const cave = chunk.cave;
    const x = cave.x0 + 240;
    const profile = caveAt(state, x);
    if (!profile || (cave.pocket && Math.abs(cave.pocket.x - x) < 60)) continue;
    state.diver.x = x;
    state.diver.y = profile.bottom + 40;
    state.stats.oxygenMax = 999;
    state.diver.oxygen = 999;
    run(state, 2, () => ({ x: 0, y: -1 }));
    assert.ok(state.diver.y > profile.bottom, 'potápěč prošel stropem jeskyně');
    tested = true;
  }
  assert.ok(tested, 'nepodařilo se vygenerovat jeskyni');
});

test('krab blokuje truhlu zepředu a uteče, když se k němu připlave zezadu', () => {
  const state = newDive();
  state.chests = [];
  state.hazards = [];
  state.sharks = [];
  const chest = { id: 'k', kind: 'common' as const, x: 300, y: 140, restY: 140, value: 80, regionId: 0, falling: false, vy: 0, phase: 0, pickupDelay: 0, boss: false, inCave: false, relic: null, rolled: false };
  state.chests.push(chest);
  state.hazards.push(newHazard('crab', 'crab', 300, 120, { timer: 99, link: 'k' }));
  state.diver.x = 300;
  state.diver.y = 140;
  run(state, 0.2, () => ({ x: 0, y: 0 }));
  assert.equal(state.diver.carried.length, 0, 'truhla pod krabem nejde sebrat');
  state.diver.x = 270;
  state.diver.y = 125;
  state.diver.invuln = 0;
  run(state, 2.5, () => ({ x: 0, y: 0 }));
  assert.equal(state.hazards[0].alive, false, 'krab měl utéct');
});

test('doupě Megalodona má jeho poklad s relikvií a boss útočí výpadem', async () => {
  const { isBossChunk } = await import('../src/game/world');
  const state = newDive();
  const index = Math.ceil(REGIONS[5].start / 480);
  assert.ok(isBossChunk(state, index));
  state.chunks.set(index, generateChunk(state, index));
  const chest = state.chests.find((c) => c.boss);
  const mega = state.sharks.find((s) => s.kind === 'mega');
  assert.ok(chest && mega, 'v doupěti musí být poklad i Megalodon');
  state.stats.oxygenMax = 999;
  state.diver.oxygen = 999;
  state.diver.health = 9999;
  state.diver.x = chest.x;
  state.diver.y = chest.y - 10;
  const modes = new Set<string>();
  for (let t = 0; t < 6; t += DT) {
    step(state, { x: 0, y: 0 }, DT, VIEW);
    modes.add(mega.mode);
  }
  assert.ok(modes.has('telegraph') && modes.has('charge'), `Megalodon měl ohlásit a provést výpad, režimy: ${[...modes].join(',')}`);
  const loot = [...state.diver.carried, ...state.chests].find((c) => c.boss);
  assert.ok(loot?.relic, 'poklad Megalodona vždy obsahuje relikvii');
});

test('do vzduchové kapsy se dá vyplavat zespodu a doplní kyslík', async () => {
  const { caveAt } = await import('../src/game/world');
  let tested = false;
  for (let attempt = 0; attempt < 40 && !tested; attempt++) {
    const state = newDive();
    ensureChunks(state, 3000, 3000);
    const chunk = [...state.chunks.values()].find((c) => c.cave?.pocket);
    if (!chunk?.cave?.pocket) continue;
    const pocket = chunk.cave.pocket;
    const profile = caveAt(state, pocket.x);
    if (!profile) continue;
    state.sharks = [];
    state.hazards = [];
    state.diver.x = pocket.x;
    state.diver.y = profile.bottom + 60;
    state.diver.oxygen = state.stats.oxygenMax * 0.3;
    run(state, 3, () => ({ x: 0, y: -1 }));
    assert.ok(state.diver.inAir, `potápěč se nedostal do kapsy (y=${Math.round(state.diver.y)}, strop=${Math.round(profile.bottom)})`);
    assert.ok(state.diver.oxygen > state.stats.oxygenMax * 0.4, 'kapsa měla doplnit kyslík');
    tested = true;
  }
  assert.ok(tested, 'nepodařilo se vygenerovat jeskyni se vzduchovou kapsou');
});

test('balón, který ještě stoupá, se při návratu na loď započítá', async () => {
  const { launchBalloon } = await import('../src/game/systems/extras');
  const { finishDive } = await import('../src/game/systems/dive');
  const state = newDive();
  state.diver.balloons = 1;
  state.diver.x = state.boat.x + 150;
  state.diver.y = 200;
  state.diver.carried = [{ id: 'r', kind: 'common', value: 80, weight: 1, regionId: 0, relic: null, boss: false }];
  launchBalloon(state);
  finishDive(state, true);
  const finished = state.events.find((e) => e.type === 'finished');
  assert.ok(finished && finished.type === 'finished');
  assert.equal(finished.result.banked.length, 1);
  assert.equal(finished.result.bankedLost, 0);
});

test('chobotnice se jen brání inkoustem a nezraňuje', () => {
  const state = newDive();
  state.sharks = [];
  state.hazards = [];
  state.diver.x = 400;
  state.diver.y = 150;
  state.hazards.push(newHazard('o', 'octopus', 420, 150));
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(state.diver.health, 100);
  assert.ok(state.inkTime > 0, 'chobotnice měla vystříknout inkoust');
  assert.ok(state.inkTime <= 1.4);
});

function expeditionSave(): SaveData {
  return migrateSave({
    version: DEFAULT_SAVE.version,
    money: 50000,
    upgrades: { ...EMPTY_LEVELS, boat: 5, tank: 6, medkit: 0 },
    missionsDone: ['first', 'three'],
    missionProgress: { earn1000: 400 },
    stats: { dives: 40, successes: 30, totalEarned: 90000, bestDepth: 110, chests: 70 },
    settings: { music: true, sfx: true, haptics: true },
    tutorialSeen: true,
    relics: ['horn'],
    explored: { left: 3000, right: 9000 },
    discoveries: ['cave'],
    skins: ['classic', 'coral'],
    skin: 'coral',
    challengeDone: '',
    bossLoot: 1,
    expedition: 0,
    pearls: 3,
    perks: { capital: 2, shipwright: 1, veteran: 1 },
    run: { earned: 90000, boss: true },
    shaftBest: 0,
    storyChapter: 2,
  });
}

test('nová výprava resetuje peníze, vybavení a mise, ale nechá relikvie a přidá perly', () => {
  const save = expeditionSave();
  assert.equal(canEmbark({ ...save, run: { earned: 90000, boss: false } }), false, 'bez pokladu Megalodona nejde vyplout');
  assert.equal(canEmbark({ ...save, upgrades: { ...save.upgrades, boat: 0 } }), true, 'loď už není podmínkou');
  assert.equal(canEmbark({ ...save, storyChapter: 0 }), false, 'bez dokončeného Karibiku nejde vyplout');
  assert.equal(canEmbark({ ...save, run: { earned: embarkEarnings(0) - 1, boss: true } }), false, 'bez výdělku výpravy nejde vyplout');
  assert.equal(canEmbark(save), true);
  const next = embarkSave(save);
  assert.equal(next.expedition, 1);
  assert.equal(next.pearls, 3 + pearlsFor(90000, 0));
  assert.equal(next.money, 4000);
  assert.equal(next.upgrades.boat, 1);
  assert.equal(next.upgrades.tank, 1);
  assert.equal(next.upgrades.medkit, 1, 'veterán dostane i vybavení odemčené novou výpravou');
  assert.deepEqual(next.missionsDone, []);
  assert.deepEqual(next.relics, ['horn']);
  assert.deepEqual(next.skins, ['classic', 'coral']);
  assert.deepEqual(next.run, { earned: 0, boss: false });
  assert.equal(next.storyChapter, 2, 'příběh pokračuje přes výpravy');
});

test('výprava zvedá strop vybavení, nebezpečí i hodnotu pokladů', () => {
  const tank = UPGRADES.find((u) => u.id === 'tank')!;
  const boat = UPGRADES.find((u) => u.id === 'boat')!;
  const scooter = UPGRADES.find((u) => u.id === 'scooter')!;
  assert.equal(maxLevel(tank, 0), 6);
  assert.equal(maxLevel(tank, 1), 7);
  assert.equal(maxLevel(tank, 8), 11);
  assert.equal(maxLevel(tank, 0, 8), 10, 'příběh přidá úrovně i bez nové výpravy');
  assert.equal(maxLevel(boat, 5), 7);
  assert.equal(unlocked(scooter, 0), false);
  assert.equal(unlocked(scooter, 1), true);
  const hits = [0, 2].map((expedition) => {
    const state = createGame(statsFor(EMPTY_LEVELS, [], null, { expedition, perks: {} }), VIEW);
    startDive(state);
    state.diver.y = 200;
    damageDiver(state, 20, 'shark', state.diver.x + 50, state.diver.y, false);
    return 100 - state.diver.health;
  });
  assert.ok(Math.abs(hits[1] - hits[0] * 1.3) < 0.01, `zásah ${hits[1]} místo ${hits[0] * 1.3}`);
  const rich = statsFor(EMPTY_LEVELS, [], null, { expedition: 2, perks: { trader: 1 } });
  assert.ok(Math.abs(rich.lootBonus - 0.7) < 1e-9);
});

test('pojištění vrátí část ztraceného nákladu při nezdaru', () => {
  const state = createGame(statsFor({ ...EMPTY_LEVELS, insurance: 2 }), VIEW);
  startDive(state);
  state.diver.carried.push({ id: 'x', kind: 'rare', value: 400, regionId: 1, relic: null, boss: false, weight: 1 });
  state.diver.y = 300;
  state.diver.health = 0;
  const result = run(state, 10, () => ({ x: 0, y: 0 }));
  assert.ok(result);
  assert.equal(result.success, false);
  assert.equal(result.insured, Math.round(400 * 0.25));
  assert.equal(result.total, result.insured);
});

test('lékárnička doplní zdraví a skútr zrychlí potápěče nad běžné maximum', () => {
  const state = createGame(statsFor({ ...EMPTY_LEVELS, medkit: 1, scooter: 1 }, [], null, { expedition: 1, perks: {} }), VIEW);
  startDive(state);
  run(state, 1.5, () => ({ x: 0, y: 1 }));
  state.diver.health = 30;
  healDiver(state);
  assert.equal(state.diver.health, 30 + MEDKIT_HEAL);
  assert.equal(state.diver.medkits, 0);
  healDiver(state);
  assert.equal(state.diver.health, 30 + MEDKIT_HEAL);
  const normal = state.stats.speed;
  fireScooter(state);
  run(state, 0.8, () => ({ x: 1, y: 0 }));
  assert.ok(state.diver.vx > normal * 1.3, `rychlost ${state.diver.vx} nepřekročila ${normal * 1.3}`);
  assert.ok(state.boostCooldown > 0);
});

function harpoonDive(level: number): GameState {
  const state = createGame(statsFor({ ...EMPTY_LEVELS, harpoon: level }), VIEW);
  startDive(state);
  run(state, 1.5, () => ({ x: 0, y: 1 }));
  state.sharks = [];
  state.hazards = [];
  state.diver.facing = 1;
  state.diver.invuln = 1e6;
  state.diver.oxygen = 1e6;
  return state;
}

test('harpuna bez cíle vystřelí naprázdno a nespotřebuje se', () => {
  const state = harpoonDive(1);
  fireHarpoon(state);
  assert.equal(state.diver.harpoons, 1, 'bez cíle se harpuna nespotřebuje');
  assert.equal(state.harpoonShots.length, 1, 'výstřel musí být vidět');
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.equal(state.harpoonShots.length, 0, 'harpuna po doletu zmizí');
});

test('harpuna doletí za žralokem, zasáhne ho a žralok zmizí', () => {
  const state = harpoonDive(1);
  state.sharks.push(newShark('t', 'reef', state.diver.x + 220, state.diver.y + 30, 200, false, 0));
  run(state, 0.05, () => ({ x: 0, y: 0 }));
  assert.equal(state.harpoonAim?.id, 't', 'žralok před potápěčem je zaměřený');
  fireHarpoon(state);
  assert.equal(state.diver.harpoons, 0);
  assert.equal(state.sharks[0].dying, 0, 'zásah není okamžitý, harpuna musí doletět');
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.ok(state.sharks[0]?.dying > 0, 'zasažený žralok umírá');
  run(state, 2, () => ({ x: 0, y: 0 }));
  assert.equal(state.sharks.length, 0, 'mrtvý žralok zmizí');
});

test('boss vydrží víc zásahů harpunou', () => {
  const state = harpoonDive(3);
  state.diver.harpoons = 3;
  const boss = newShark('boss', 'mega', state.diver.x + 300, state.diver.y, 200, true, 0);
  state.sharks.push(boss);
  for (let i = 0; i < 2; i++) {
    state.diver.x = boss.x - 300;
    state.diver.y = boss.y;
    run(state, 0.05, () => ({ x: 0, y: 0 }));
    fireHarpoon(state);
    run(state, 0.8, () => ({ x: 0, y: 0 }));
  }
  assert.equal(boss.hp, 1, 'po dvou zásazích zbývá Megalodonovi jeden život');
  assert.equal(boss.dying, 0, 'boss po dvou zásazích žije');
  state.diver.x = boss.x - 300;
  state.diver.y = boss.y;
  run(state, 0.05, () => ({ x: 0, y: 0 }));
  fireHarpoon(state);
  run(state, 0.8, () => ({ x: 0, y: 0 }));
  assert.ok(boss.dying > 0, 'třetí zásah bosse porazí');
});

test('harpuna zasáhne i nebezpečného tvora a ten zmizí', () => {
  const state = harpoonDive(1);
  const jelly = newHazard('j', 'jelly', state.diver.x + 160, state.diver.y);
  state.hazards.push(jelly);
  run(state, 0.05, () => ({ x: 0, y: 0 }));
  fireHarpoon(state);
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(jelly.alive, false);
  assert.equal(state.diver.harpoons, 0);
});

test('mini ponorka pod lodí doplňuje kyslík', () => {
  const state = createGame(statsFor({ ...EMPTY_LEVELS, submarine: 1 }), VIEW);
  startDive(state);
  assert.ok(state.sub, 'ponorka musí kotvit pod lodí');
  state.diver.x = state.sub.x;
  state.diver.y = state.sub.y;
  state.diver.oxygen = 10;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.atSub);
  assert.ok(state.diver.oxygen > 10, `kyslík ${state.diver.oxygen} nestoupá`);
});

test('propast nemá dno, stěny drží potápěče a s hloubkou se zužují', () => {
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, mode: 'endless' });
  startDive(state);
  const shallow = shaftWalls(state.seed, 300);
  const deep = shaftWalls(state.seed, 4000);
  assert.ok(deep.right - deep.left < shallow.right - shallow.left, 'propast se má hlouběji zužovat');
  state.diver.y = 2000;
  state.diver.x = shaftWalls(state.seed, 2000).left - 300;
  run(state, 0.2, () => ({ x: -1, y: 0 }));
  assert.ok(state.diver.x >= shaftWalls(state.seed, state.diver.y).left, 'potápěč nesmí projít stěnou');
  state.diver.oxygen = 1e6;
  state.diver.invuln = 1e6;
  const before = state.diver.y;
  run(state, 4, () => ({ x: 0, y: 1 }));
  assert.ok(state.diver.y > before + 300, 'v propasti se dá klesat bez dna');
  assert.ok(state.shaftSegments.size > 2);
  assert.ok(state.airs.length > 0 && state.coins.length > 0);
});

test('kyslíková bublina v propasti doplní kyslík', () => {
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, mode: 'endless' });
  startDive(state);
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  const air = state.airs[0];
  state.diver.x = air.x;
  state.diver.y = air.y;
  state.diver.oxygen = 5;
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.oxygen > 5 + state.stats.oxygenMax * 0.25);
  assert.ok(!state.airs.includes(air));
});

test('propast vyplatí mince a hloubku i při nezdaru a dá perly za rekord', () => {
  const state = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, mode: 'endless' });
  startDive(state);
  state.diver.y = 2400;
  state.record.maxDepth = 2400;
  state.diver.coins = 120;
  state.diver.health = 0;
  const result = run(state, 10, () => ({ x: 0, y: 0 }));
  assert.ok(result);
  assert.equal(result.mode, 'endless');
  assert.equal(result.success, false);
  assert.equal(result.coins, 120);
  assert.equal(result.depthBonus, 240 * 5);
  assert.equal(result.total, 120 + 240 * 5);
  assert.equal(shaftPearls(80, 240), 2);
  assert.equal(shaftPearls(240, 250), 0);
});

function hazardArena(kind: Hazard['kind'], extra: Partial<Hazard> = {}) {
  const state = newDive();
  run(state, 1.5, () => ({ x: 0, y: 1 }));
  state.sharks = [];
  state.hazards = [newHazard('t', kind, state.diver.x + 100, state.diver.y, extra)];
  state.diver.invuln = 0;
  return { state, hazard: state.hazards[0] };
}

test('ďas číhá, při přiblížení vyrazí a kousne', () => {
  const { state, hazard } = hazardArena('angler');
  hazard.dir = -1;
  run(state, 0.05, () => ({ x: 0, y: 0 }));
  assert.notEqual(hazard.state, 0, 'ďas má vyrazit na blízkého potápěče');
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.health < 100);
  assert.equal(state.lastDamage, 'angler');
});

test('rejnok se před výbojem nabíjí a výboj omráčí jen v dosahu', () => {
  const { state, hazard } = hazardArena('ray', { size: 0, cooldown: 0 });
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.equal(hazard.state, 1, 'rejnok se má nejdřív nabíjet');
  assert.equal(state.diver.health, 100, 'během nabíjení nesmí zranit');
  state.diver.x = hazard.x + 50;
  state.diver.y = hazard.y;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.health < 100);
  assert.equal(state.lastDamage, 'ray');
});

test('toxický mrak zraňuje postupně a jen uvnitř', () => {
  const { state, hazard } = hazardArena('toxic', { size: 70 });
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  const outside = state.diver.health;
  assert.equal(outside, 100, 'mimo mrak se nic nestane');
  state.diver.x = hazard.x;
  state.diver.y = hazard.y;
  run(state, 1, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.health < 100 && state.diver.health > 90, `zdraví ${state.diver.health}`);
  assert.equal(state.lastDamage, 'toxic');
});

test('ostnatá past zraní jen s vysunutými hroty', () => {
  const { state, hazard } = hazardArena('spikes', { phase: 0 });
  state.diver.x = hazard.x;
  state.diver.y = hazard.y - 22;
  hazard.phase = 0;
  run(state, 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(state.diver.health, 100, 'zatažené hroty nezraňují');
  hazard.phase = SPIKE_OUT + 0.05;
  state.diver.x = hazard.x;
  state.diver.y = hazard.y - 22;
  run(state, 0.05, () => ({ x: 0, y: 0 }));
  assert.ok(state.diver.health < 100);
  assert.equal(state.lastDamage, 'spikes');
});

test('drahokamová truhla patří do hlubokých oblastí', () => {
  assert.equal(CHEST_WEIGHTS[0].jeweled, undefined);
  assert.ok((CHEST_WEIGHTS[7].jeweled ?? 0) > 0);
  assert.ok(CHESTS.jeweled.min > CHESTS.epic.max);
});

test('nepřátel je na úseku nanejvýš tolik, kolik dovolí oblast, a netvoří neprůchodnou zeď', () => {
  const floating = (h: Hazard) => !['urchin', 'spikes', 'crab', 'eel'].includes(h.kind);
  for (let seed = 1; seed < 12; seed++) {
    const state = newDive();
    state.seed = seed * 7919;
    for (let i = 2; i < 48; i++) {
      state.sharks = [];
      state.hazards = [];
      generateChunk(state, i);
      const region = REGIONS[regionIndexAt(REGIONS, i * 480 + 240)].tier;
      const guards = state.hazards.filter((h) => h.kind === 'crab' || h.kind === 'eel').length + state.sharks.filter((s) => s.kind === 'mega').length;
      assert.ok(state.sharks.length + state.hazards.length <= CHUNK_THREATS[region] + guards, `úsek ${i}: ${state.sharks.length + state.hazards.length} nepřátel`);
      const columns = state.hazards.filter(floating);
      for (const a of columns) for (const b of columns) if (a !== b) assert.ok(Math.abs(a.x - b.x) >= SEA_COLUMN_GAP, `úsek ${i}: ${a.kind} nad ${b.kind}`);
    }
  }
  const shaft = createGame(statsFor(EMPTY_LEVELS), VIEW, 0, { ownedRelics: [], skin: 'classic', challenge: null, mode: 'endless' });
  for (let seg = 1; seg < 8; seg++) {
    shaft.sharks = [];
    shaft.hazards = [];
    shaft.shaftSegments = new Set(Array.from({ length: 20 }, (_, i) => i).filter((i) => i !== seg));
    ensureShaft(shaft, seg * 800, 10);
    assert.ok(shaft.sharks.length + shaft.hazards.length <= shaftThreats(seg * 80));
    const rows = shaft.hazards.filter(floating);
    for (const a of rows) for (const b of rows) if (a !== b) assert.ok(Math.abs(a.y - b.y) >= SHAFT_ROW_GAP);
  }
});

test('starý save se převede bez ztráty postupu', () => {
  const old = { money: 1234, upgrades: { tank: 3, boat: 2 }, abyssBest: 180, storyChapter: 3, missionsDone: ['first'], relics: ['horn'] };
  const save = migrateSave(old);
  assert.equal(save.version, DEFAULT_SAVE.version);
  assert.equal(save.money, 1234);
  assert.equal(save.upgrades.tank, 3);
  assert.equal(save.upgrades.harpoon, 0);
  assert.equal(save.shaftBest, 180);
  assert.equal(save.storyChapter, 0);
  assert.deepEqual(save.relics, ['horn']);
  assert.equal(migrateSave(null).money, 0);
});

test('hledáček se ukáže jen v režimu fotoaparátu, první C zapne, druhé fotí', () => {
  const state = newDive();
  run(state, 2, () => ({ x: 0, y: 1 }));
  state.sharks = [];
  state.hazards = [];
  state.diver.facing = 1;
  state.fish = [{ id: 'test', sprite: 'fish_clown', x: state.diver.x + 120, y: state.diver.y, vx: 0, minX: state.diver.x + 120, maxX: state.diver.x + 120, count: 1, phase: 0, size: 24 }];
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.equal(state.photoAim, null);
  cameraKey(state);
  run(state, 0.1, () => ({ x: 0, y: 0 }));
  assert.ok(state.photoAim);
  cameraKey(state);
  assert.equal(state.record.photos[0]?.species, 'fish_clown');
  run(state, PHOTO_MODE_TIME + 0.5, () => ({ x: 0, y: 0 }));
  assert.equal(state.photoMode, 0);
  assert.equal(state.photoAim, null);
});
