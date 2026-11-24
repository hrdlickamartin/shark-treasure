import { addCounts, type MaterialCounts } from '../game/gear';
import { OCEAN_ORDER, OCEANS, type OceanId } from '../game/oceans';
import { hash } from '../game/rng';
import type { DiveResult, PropSpec } from '../game/types';
import { addKit, affordable, MODS, type ModId, type ModSlot, recipeById, spendMaterials } from './crafting';
import { addReputation, contractMet, contractsFor, discountFor, FACTION_IDS, type FactionId, SHARD_PENALTY, SHARD_REP, SHARD_REWARDS, tierOf } from './factions';
import { MODULES, type ModuleId, type ModuleSlot, openSlots } from './modules';
import type { Ending, HuntSpot, Rift, SaveData } from './saveData';

export interface RiftRules {
  max: number;
  dives: number;
  research: number;
  materials: number;
  shards: number;
}

export const RIFT_RULES: Record<Ending, RiftRules> = {
  guardian: { max: 2, dives: 5, research: 1.5, materials: 1, shards: 1 },
  hidden: { max: 1, dives: 3, research: 1, materials: 1, shards: 1 },
  power: { max: 4, dives: 4, research: 1, materials: 2, shards: 1 },
  sacrifice: { max: 1, dives: 2, research: 1, materials: 1, shards: 2 },
};

export const RIFT_LIFT = 200;

export function expansionOn(save: SaveData): boolean {
  return save.flags.includes('expansion');
}

export function hasFlag(save: SaveData, flag: string): boolean {
  if (flag === 'allies3') return FACTION_IDS.filter((f) => tierOf(save.reputation[f]) >= 3).length >= 3;
  if (flag.startsWith('rifts')) return save.rifts.closed >= Number(flag.slice(5));
  if (flag.startsWith('respect:')) return tierOf(save.reputation[flag.slice(8) as FactionId]) >= 3;
  return save.flags.includes(flag);
}

function riftSpot(seed: number, oceans: OceanId[]): { ocean: OceanId; x: number } {
  const pool = OCEAN_ORDER.filter((id) => oceans.includes(id));
  const ocean = pool[seed % pool.length];
  const regions = OCEANS[ocean].regions;
  const region = 1 + (hash(seed, 3) % Math.min(4, regions.length - 1));
  const side = hash(seed, 5) % 2 === 0 ? 1 : -1;
  const x = side * (regions[region].start + 300 + (hash(seed, 7) % 900));
  return { ocean, x };
}

export function tickRifts(save: SaveData, closedIds: string[]): SaveData['rifts'] {
  if (!expansionOn(save) || !save.ending || save.tideEnding === 'sleep') return { ...save.rifts, active: [] };
  const rules = RIFT_RULES[save.ending];
  let seq = save.rifts.seq;
  const active: Rift[] = save.rifts.active.filter((r) => !closedIds.includes(r.id)).map((r) => ({ ...r, left: r.left - 1 })).filter((r) => r.left > 0);
  const max = save.tideEnding === 'harvest' ? rules.max + 1 : rules.max;
  while (active.length < max) {
    seq += 1;
    const spot = riftSpot(hash(seq, save.stats.dives, 911), save.oceans);
    active.push({ id: `r${seq}`, ocean: spot.ocean, x: spot.x, left: rules.dives });
  }
  return { active, closed: save.rifts.closed + closedIds.length, seq };
}

export function riftProps(save: SaveData, ocean: OceanId): PropSpec[] {
  if (!expansionOn(save)) return [];
  return save.rifts.active
    .filter((r) => r.ocean === ocean)
    .flatMap((r) => [
      { id: `rift:${r.id}:zone`, kind: 'rift' as const, x: r.x, lift: RIFT_LIFT, quest: null, sprite: null, active: true, value: 0 },
      { id: `rift:${r.id}`, kind: 'shard' as const, x: r.x, lift: RIFT_LIFT, quest: null, sprite: 'atlantean_shard' as const, active: false, value: 0 },
    ]);
}

export function shardsDelivered(result: DiveResult): string[] {
  return result.delivered.filter((id) => /^rift:r\d+$/.test(id)).map((id) => id.slice(5));
}

export function handOverShard(save: SaveData, faction: FactionId): SaveData | null {
  if (save.shards.pending <= 0) return null;
  const reward = SHARD_REWARDS[faction];
  const hunt = save.hunt.pieces + reward.bottles;
  const next: SaveData = {
    ...save,
    shards: { ...save.shards, pending: save.shards.pending - 1 },
    money: save.money + reward.money,
    researchData: save.researchData + reward.research,
    materials: addCounts(save.materials, reward.materials),
    reputation: addReputation(save.reputation, faction, SHARD_REP, SHARD_PENALTY),
    hunt: { ...save.hunt, pieces: hunt },
  };
  return startHunt(next);
}

const HUNT_SIDES = ['vlevo', 'vpravo'];

export function startHunt(save: SaveData): SaveData {
  if (save.hunt.active || save.hunt.pieces < 3) return save;
  const seed = hash(save.hunt.found, save.stats.dives, 1717);
  const pool = OCEAN_ORDER.filter((id) => save.oceans.includes(id));
  const ocean = pool[seed % pool.length];
  const regions = OCEANS[ocean].regions;
  const region = 1 + (hash(seed, 2) % Math.min(3, regions.length - 1));
  const side = hash(seed, 4) % 2 === 0 ? 1 : -1;
  const offset = 400 + (hash(seed, 6) % 900);
  const x = side * (regions[region].start + offset);
  const clue = `${OCEANS[ocean].czech}, ${regions[region].name}: ${HUNT_SIDES[side > 0 ? 1 : 0]} od přístavu, asi ${Math.round(Math.abs(x) / 10)} m. Pískový val odhalí sonar nebo Pip.`;
  const active: HuntSpot = { ocean, x, clue };
  return { ...save, hunt: { ...save.hunt, pieces: save.hunt.pieces - 3, active } };
}

export function huntProps(save: SaveData, ocean: OceanId): PropSpec[] {
  const spot = save.hunt.active;
  if (!spot || spot.ocean !== ocean) return [];
  return [{ id: `dig:${save.hunt.found}`, kind: 'dig', x: spot.x, lift: 10, quest: null, sprite: 'sand_mound', active: false, value: 0 }];
}

export function addBottle(save: SaveData): SaveData {
  return startHunt({ ...save, hunt: { ...save.hunt, pieces: save.hunt.pieces + 1 } });
}

export const MAP_PIECE_PRICE = 1500;

export function buyMapPiece(save: SaveData): SaveData | null {
  if (tierOf(save.reputation.brotherhood) < 1 || save.money < MAP_PIECE_PRICE) return null;
  return addBottle({ ...save, money: save.money - MAP_PIECE_PRICE });
}

export interface SafariTarget {
  species: string;
  behavior: string;
  label: string;
}

export const SAFARI_TARGETS: SafariTarget[] = [
  { species: 'reef', behavior: 'attack', label: 'Útesový žralok při výpadu' },
  { species: 'ray', behavior: 'discharge', label: 'Rejnok při výboji' },
  { species: 'pistol', behavior: 'shot', label: 'Krevetka pistolník při výstřelu' },
  { species: 'tidewarden_young', behavior: 'swim', label: 'Mladý Strážce při plavání' },
  { species: 'eel', behavior: 'attack', label: 'Muréna při útoku' },
  { species: 'vent', behavior: 'breath', label: 'Dýchací průduch při výdechu' },
  { species: 'mimic', behavior: 'revealed', label: 'Odhalená mimikry chobotnice' },
];

export const safariTarget = (week: number) => SAFARI_TARGETS[((week % SAFARI_TARGETS.length) + SAFARI_TARGETS.length) % SAFARI_TARGETS.length];

export const SAFARI_REWARD = { money: 800, research: 50, rep: 60 };

export const WEEKLY_PEARLS = 3;
export const LEGENDARY_MATERIALS: MaterialCounts = { alloy: 3, obsidian: 2 };

export function weeklyOcean(save: SaveData, week: number): OceanId {
  const pool = OCEAN_ORDER.filter((id) => save.oceans.includes(id));
  return pool[((week % pool.length) + pool.length) % pool.length];
}

export const weeklySeed = (week: number) => hash(week, 4093) % 2147483647;

export interface TideDive {
  save: SaveData;
  shards: number;
  contracts: string[];
  safari: boolean;
  weekly: boolean;
  hunt: boolean;
}

export function applyTideDive(save: SaveData, result: DiveResult, day: string, week: number, aquariumOn: boolean): TideDive {
  const closed = shardsDelivered(result);
  const rules = save.ending ? RIFT_RULES[save.ending] : RIFT_RULES.guardian;
  const shardCount = closed.length * rules.shards;
  const materials = addCounts(addCounts(save.materials, result.materials), closed.length ? { alloy: closed.length * rules.materials } : {});
  const kit = addCounts(save.kit, result.kitUsed, -1);
  const aquarium = aquariumOn ? [...new Set([...save.aquarium, ...result.scans.filter((s) => s.startsWith('net:')).map((s) => s.slice(4))])] : save.aquarium;
  const contracts = save.contracts.day === day ? save.contracts : { day, done: [] };
  const met = contractsFor(day).filter((c) => !contracts.done.includes(c.id) && c.kind !== 'materials' && contractMet(c, result, closed.length));
  let reputation = save.reputation;
  let money = save.money;
  for (const c of met) {
    reputation = addReputation(reputation, c.faction, c.rep);
    money += c.money;
  }
  const target = safariTarget(week);
  const safariDone = save.safari.week === week && save.safari.done;
  const safari = !safariDone && result.photos.some((p) => p.species === target.species && p.behavior === target.behavior);
  if (safari) {
    money += SAFARI_REWARD.money;
    reputation = addReputation(reputation, 'institute', SAFARI_REWARD.rep);
  }
  const weeklyState = save.weekly.week === week ? save.weekly : { week, best: 0, depth: 0, rewarded: false };
  const weeklyRun = result.variant === 'weekly';
  const weeklyReward = weeklyRun && result.success && !weeklyState.rewarded;
  const hunted = save.hunt.active && result.delivered.some((id) => id.startsWith('dig:'));
  if (hunted) reputation = addReputation(reputation, 'brotherhood', 80);
  const legendary = result.variant === 'legendary' && result.bossLoot;
  const next: SaveData = {
    ...save,
    materials: legendary ? addCounts(materials, LEGENDARY_MATERIALS) : materials,
    kit,
    aquarium,
    reputation,
    money,
    researchData: save.researchData + (safari ? SAFARI_REWARD.research : 0) + Math.round(closed.length * 25 * rules.research),
    pearls: save.pearls + (weeklyReward ? WEEKLY_PEARLS : 0),
    contracts: { day, done: [...contracts.done, ...met.map((c) => c.id)] },
    shards: { pending: save.shards.pending + shardCount, total: save.shards.total + shardCount },
    rifts: tickRifts(save, closed),
    safari: safari ? { week, done: true } : save.safari.week === week ? save.safari : { week, done: false },
    weekly: weeklyRun ? { week, best: Math.max(weeklyState.best, result.total), depth: Math.max(weeklyState.depth, result.maxDepthM), rewarded: weeklyState.rewarded || weeklyReward } : weeklyState,
    hunt: hunted ? { ...save.hunt, active: null, found: save.hunt.found + 1 } : save.hunt,
  };
  return { save: next, shards: shardCount, contracts: met.map((c) => c.label), safari, weekly: weeklyReward, hunt: !!hunted };
}

export function craft(save: SaveData, recipeId: string): SaveData | null {
  const recipe = recipeById(recipeId);
  if (!recipe) return null;
  if (recipe.unlock && tierOf(save.reputation[recipe.unlock.faction]) < recipe.unlock.tier) return null;
  if (save.money < recipe.money || !affordable(save.materials, recipe.cost)) return null;
  const out = recipe.output;
  if (out.kind === 'mod' && save.mods.owned.includes(out.id)) return null;
  const base: SaveData = { ...save, money: save.money - recipe.money, materials: spendMaterials(save.materials, recipe.cost), crafted: [...new Set([...save.crafted, recipe.id])] };
  if (out.kind === 'kit') return { ...base, kit: addKit(save.kit, out.id, out.amount) };
  if (out.kind === 'supply') return { ...base, supplies: { ...save.supplies, [out.id]: save.supplies[out.id] + out.amount } };
  const slot = MODS[out.id].slot;
  return { ...base, mods: { owned: [...save.mods.owned, out.id], equipped: { ...save.mods.equipped, [slot]: save.mods.equipped[slot] ?? out.id } } };
}

export function equipMod(save: SaveData, slot: ModSlot, id: ModId | null): SaveData | null {
  if (id && (!save.mods.owned.includes(id) || MODS[id].slot !== slot)) return null;
  const equipped = { ...save.mods.equipped };
  if (id) equipped[slot] = id;
  else delete equipped[slot];
  return { ...save, mods: { ...save.mods, equipped } };
}

export function modulePrice(save: SaveData, id: ModuleId): number {
  return Math.round(MODULES[id].money * discountFor(save.reputation, 'guild'));
}

export function moduleLocked(save: SaveData, id: ModuleId): boolean {
  const faction = MODULES[id].faction;
  return !!faction && tierOf(save.reputation[faction]) < 2;
}

export function buyModule(save: SaveData, id: ModuleId): SaveData | null {
  const def = MODULES[id];
  const price = modulePrice(save, id);
  if (save.modules.owned.includes(id) || moduleLocked(save, id) || save.money < price || !affordable(save.materials, def.cost)) return null;
  const free = !save.modules.equipped[def.slot] && openSlots(save.upgrades.boat).includes(def.slot);
  return {
    ...save,
    money: save.money - price,
    materials: spendMaterials(save.materials, def.cost),
    modules: { owned: [...save.modules.owned, id], equipped: free ? { ...save.modules.equipped, [def.slot]: id } : save.modules.equipped },
  };
}

export function equipModule(save: SaveData, slot: ModuleSlot, id: ModuleId | null): SaveData | null {
  if (id && (!save.modules.owned.includes(id) || MODULES[id].slot !== slot || !openSlots(save.upgrades.boat).includes(slot))) return null;
  const equipped = { ...save.modules.equipped };
  if (id) equipped[slot] = id;
  else delete equipped[slot];
  return { ...save, modules: { ...save.modules, equipped } };
}

export function activeModules(save: SaveData): SaveData['modules']['equipped'] {
  return equippedModules(save.upgrades.boat, save.modules.equipped);
}

export function equippedModules(boat: number, equipped: SaveData['modules']['equipped']): SaveData['modules']['equipped'] {
  const open = openSlots(boat);
  return Object.fromEntries(Object.entries(equipped).filter(([slot]) => open.includes(slot as ModuleSlot)));
}

export function claimContract(save: SaveData, day: string, id: string): SaveData | null {
  const contract = contractsFor(day).find((c) => c.id === id);
  const contracts = save.contracts.day === day ? save.contracts : { day, done: [] };
  if (!contract || contract.kind !== 'materials' || !contract.materials || contracts.done.includes(id) || !affordable(save.materials, contract.materials)) return null;
  return {
    ...save,
    materials: spendMaterials(save.materials, contract.materials),
    money: save.money + contract.money,
    reputation: addReputation(save.reputation, contract.faction, contract.rep),
    contracts: { day, done: [...contracts.done, id] },
  };
}

export function researchCost(save: SaveData, cost: number): number {
  return save.modules.equipped.deck === 'lab' && openSlots(save.upgrades.boat).includes('deck') ? Math.round(cost * 0.8) : cost;
}
