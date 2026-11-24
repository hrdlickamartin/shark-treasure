import { BOAT_DECK_Y, DOCK_DEPTH, DOCK_RADIUS_X, MAX_HEALTH, PX_PER_M } from '../constants';
import { oceanOf } from '../oceans';
import { regionIndexAt } from '../regions';
import { CHALLENGES, CONDITIONS } from '../modifiers';
import type { DiveResult, GameState } from '../types';
import { BALLOON_HAUL_RANGE, submarineSpot } from './extras';
import { bubble, burst, haptic, sfx } from './effects';

export function greedMultiplier(count: number): number {
  if (count >= 4) return 2;
  if (count === 3) return 1.5;
  if (count === 2) return 1.25;
  return 1;
}

export function computeResult(state: GameState, success: boolean): DiveResult {
  const { diver, record, stats } = state;
  const banked = state.balloons.filter((b) => Math.abs(b.x - state.boat.x) < BALLOON_HAUL_RANGE).map((b) => b.chest);
  const bankedLost = state.balloons.length - banked.length;
  const endless = state.mode === 'endless';
  const carried = success ? [...diver.carried] : [];
  const delivered = [...carried, ...banked];
  const chestValue = delivered.reduce((sum, c) => sum + c.value, 0);
  const maxDepthM = Math.round(record.maxDepth / PX_PER_M);
  const multiplier = greedMultiplier(delivered.length);
  const greedBonus = Math.round(chestValue * (multiplier - 1));
  const conditionBonus = Math.round(chestValue * (CONDITIONS[state.condition].reward - 1));
  const relicBonus = Math.round(chestValue * stats.moneyBonus);
  const expeditionBonus = Math.round(chestValue * stats.lootBonus);
  const depthBonus = endless ? Math.round(maxDepthM * 5 * (1 + stats.lootBonus)) : success && maxDepthM >= 5 ? Math.round(maxDepthM * 3) : 0;
  const noHitBonus = success && record.hits === 0 && chestValue > 0 ? Math.round(chestValue * 0.15) : 0;
  const coins = success || endless ? diver.coins : 0;
  const lostValue = success || endless ? 0 : diver.carried.reduce((sum, c) => sum + c.value, 0) + diver.coins;
  const insured = Math.round(lostValue * stats.insurance);
  const rescueBonus = success ? state.props.filter((p) => p.kind === 'survivor' && !p.quest && diver.cargo.includes(p.id)).reduce((sum, p) => sum + p.value, 0) : 0;
  const base = chestValue + greedBonus + conditionBonus + relicBonus + expeditionBonus + coins + depthBonus + noHitBonus + insured + rescueBonus;
  const challengeBonus = success && state.challenge ? Math.round(base * (CHALLENGES[state.challenge].reward - 1)) : 0;
  return {
    mode: state.mode,
    ocean: state.ocean,
    delivered: success ? [...diver.cargo] : [],
    activated: [...record.activated],
    photos: record.photos.map((p) => ({ ...p })),
    cut: record.cut,
    rescueBonus,
    success,
    chests: delivered,
    coins,
    chestValue,
    depthBonus,
    noHitBonus,
    total: base + challengeBonus,
    maxDepthM,
    hits: record.hits,
    reason: success ? null : state.lastDamage ?? 'oxygen',
    lostValue,
    oxygenLeftPct: Math.round((diver.oxygen / stats.oxygenMax) * 100),
    regionMax: record.regionMax,
    duration: state.time - record.startTime,
    banked,
    bankedLost,
    multiplier,
    greedBonus,
    conditionBonus,
    relicBonus,
    expeditionBonus,
    insured,
    challengeBonus,
    relics: delivered.map((c) => c.relic).filter((r): r is NonNullable<typeof r> => !!r),
    condition: state.condition,
    challenge: state.challenge,
    pockets: record.pockets,
    balloonsSent: record.balloonsSent,
    bossLoot: delivered.some((c) => c.boss),
    minX: record.minX,
    maxX: record.maxX,
    discoveries: [...record.discoveries],
  };
}

export function startDive(state: GameState) {
  if (state.phase !== 'boat') return;
  const { diver, boat, stats } = state;
  state.phase = 'dive';
  diver.state = 'diving';
  diver.stateTime = 0;
  diver.x = boat.x + 30;
  diver.y = 18;
  diver.vx = 40;
  diver.vy = 150;
  diver.facing = 1;
  diver.health = MAX_HEALTH;
  diver.oxygen = stats.oxygenMax;
  diver.carried = [];
  diver.coins = 0;
  diver.invuln = 0;
  diver.hurt = 0;
  diver.stun = 0;
  diver.balloons = stats.balloons;
  diver.repellents = stats.repellents;
  diver.medkits = stats.medkits;
  diver.harpoons = stats.harpoons;
  diver.atSub = false;
  diver.cargo = [];
  diver.temp = 100;
  diver.medkits += state.supplies.medkit;
  diver.balloons += state.supplies.balloon;
  diver.harpoons += state.supplies.harpoon;
  state.supplies = { medkit: 0, balloon: 0, harpoon: 0 };
  state.sub = submarineSpot(state);
  diver.breathing = true;
  diver.inAir = false;
  boat.vx = 0;
  state.balloons = [];
  state.inkTime = 0;
  state.repelTime = 0;
  state.boostTime = 0;
  state.boostCooldown = 0;
  state.shaftMark = 0;
  state.lastDamage = null;
  state.alarmTimer = 0;
  state.record = { startTime: state.time, maxDepth: 0, hits: 0, regionMax: regionIndexAt(oceanOf(state).regions, diver.x), fullWarned: -10, pockets: 0, balloonsSent: 0, minX: diver.x, maxX: diver.x, discoveries: [], photos: [], activated: [], cut: 0 };
  state.sonarTime = 0;
  state.sonarCooldown = 0;
  for (let i = 0; i < 14; i++) {
    state.particles.push({ kind: 'splash', x: diver.x, y: 0, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 160, life: 0.8, maxLife: 0.8, size: 5 + Math.random() * 5 });
  }
  burst(state, 'bubble', diver.x, 40, 10, 60, 1.4, 6);
  sfx(state, 'splash');
  if (state.mode === 'sea') state.events.push({ type: 'radio', topic: 'dive_start' });
  haptic(state, 'light');
}

export function triggerSonar(state: GameState) {
  if (state.phase !== 'dive' || state.stats.sonarRange <= 0 || state.sonarCooldown > 0) return;
  state.sonarTime = 4;
  state.sonarCooldown = 10;
  sfx(state, 'bubbles', 0.7);
}

export function updateDive(state: GameState, dt: number) {
  const { diver, boat, record } = state;
  diver.stateTime += dt;
  diver.invuln = Math.max(0, diver.invuln - dt);
  diver.hurt = Math.max(0, diver.hurt - dt);
  diver.stun = Math.max(0, diver.stun - dt);
  state.sonarTime = Math.max(0, state.sonarTime - dt);
  state.sonarCooldown = Math.max(0, state.sonarCooldown - dt);

  if (diver.state === 'diving') {
    record.maxDepth = Math.max(record.maxDepth, diver.y);
    record.regionMax = Math.max(record.regionMax, regionIndexAt(oceanOf(state).regions, diver.x));
    const atBoat = diver.y < DOCK_DEPTH && Math.abs(diver.x - boat.x) < DOCK_RADIUS_X && diver.stateTime > 1.2;
    if (atBoat) {
      diver.state = 'climbing';
      diver.stateTime = 0;
      diver.vx = 0;
      diver.vy = 0;
      return;
    }
    if (diver.health <= 0) {
      diver.health = 0;
      diver.state = 'rescue';
      diver.stateTime = 0;
      sfx(state, 'fail');
      haptic(state, 'heavy');
      return;
    }
  } else if (diver.state === 'climbing') {
    updateClimb(state, dt);
  } else if (diver.state === 'rescue') {
    diver.vy = -90;
    diver.y += diver.vy * dt;
    diver.x += (boat.x - diver.x) * Math.min(1, dt * 0.8);
    if (Math.random() < dt * 6) bubble(state, diver.x, diver.y - 10, 6);
    if (diver.y < 30 || diver.stateTime > 3.5) finishDive(state, false);
  }
}

export const CLIMB = { approach: 0.25, climb: 0.65, over: 0.85, done: 1 };
const CLIMB_STEPS = 2;

const ease = (t: number) => t * t * (3 - 2 * t);

export function climbGeometry(state: GameState) {
  const { boat, stats } = state;
  const scale = 1 + stats.boatLevel * 0.07;
  return {
    ladderX: boat.x - boat.shown * 50 * scale,
    deckX: boat.x - boat.shown * 44 * scale,
    deckY: BOAT_DECK_Y * scale,
    waterY: 10,
  };
}

function updateClimb(state: GameState, dt: number) {
  const { diver } = state;
  const t = diver.stateTime;
  const prev = t - dt;
  const g = climbGeometry(state);
  diver.facing = state.boat.shown;
  diver.vx = 0;
  diver.vy = 0;
  if (t < CLIMB.approach) {
    const k = Math.min(1, dt * 9);
    diver.x += (g.ladderX - diver.x) * k;
    diver.y += (g.waterY - diver.y) * k;
  } else if (t < CLIMB.climb) {
    if (prev < CLIMB.approach) {
      for (let i = 0; i < 12; i++) {
        state.particles.push({ kind: 'splash', x: g.ladderX + (Math.random() - 0.5) * 30, y: 6, vx: (Math.random() - 0.5) * 140, vy: -100 - Math.random() * 120, life: 0.7, maxLife: 0.7, size: 5 + Math.random() * 6 });
      }
      burst(state, 'bubble', g.ladderX, 24, 6, 50, 1, 5);
      sfx(state, 'splash', 0.35);
    }
    const k = (t - CLIMB.approach) / (CLIMB.climb - CLIMB.approach);
    const step = Math.min(CLIMB_STEPS - 1, Math.floor(k * CLIMB_STEPS));
    const stepped = (step + ease(Math.min(1, (k * CLIMB_STEPS - step) * 1.4))) / CLIMB_STEPS;
    diver.x = g.ladderX;
    diver.y = g.waterY + (g.deckY - 16 - g.waterY) * stepped;
    if (Math.random() < dt * 14) {
      state.particles.push({ kind: 'splash', x: diver.x + (Math.random() - 0.5) * 20, y: diver.y + 10, vx: (Math.random() - 0.5) * 10, vy: 20, life: 0.6, maxLife: 0.6, size: 3 + Math.random() * 3 });
    }
  } else if (t < CLIMB.over) {
    const k = ease((t - CLIMB.climb) / (CLIMB.over - CLIMB.climb));
    diver.x = g.ladderX + (g.deckX - g.ladderX) * k;
    diver.y = g.deckY - 16 + 16 * k - Math.sin(Math.PI * k) * 10;
  } else {
    diver.x = g.deckX;
    diver.y = g.deckY;
    if (prev < CLIMB.over) sfx(state, 'boat_return', 0.6);
    if (t >= CLIMB.done) finishDive(state, true);
  }
}

export function finishDive(state: GameState, success: boolean) {
  const { diver } = state;
  const result = computeResult(state, success);
  state.balloons = [];
  const quick = success && result.chests.length === 0 && result.coins === 0 && result.delivered.length === 0 && result.activated.length === 0 && result.photos.length === 0 && result.duration < 5;
  diver.state = 'boat';
  diver.x = climbGeometry(state).deckX;
  diver.y = BOAT_DECK_Y;
  diver.vx = 0;
  diver.vy = 0;
  diver.carried = [];
  diver.coins = 0;
  diver.oxygen = state.stats.oxygenMax;
  diver.health = MAX_HEALTH;
  if (quick) {
    state.phase = 'boat';
    return;
  }
  state.phase = 'result';
  if (success) {
    sfx(state, 'success');
    sfx(state, 'coins', 0.8);
    haptic(state, 'success');
  }
  state.events.push({ type: 'finished', result });
}
