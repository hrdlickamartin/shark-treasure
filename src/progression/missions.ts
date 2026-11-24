import type { DiveResult } from '../game/types';

export interface MissionDef {
  id: string;
  title: string;
  reward: number;
  target: number;
  cumulative?: boolean;
  metric: (r: DiveResult) => number;
}

const delivered = (r: DiveResult) => (r.success ? r.chests.length : 0);
const deliveredKind = (r: DiveResult, kinds: string[]) => (r.success ? r.chests.filter((c) => kinds.includes(c.kind)).length : 0);

export const MISSIONS: MissionDef[] = [
  { id: 'first', title: 'Doruč první truhlici na loď', reward: 100, target: 1, metric: delivered },
  { id: 'depth20', title: 'Dosáhni hloubky 20 m', reward: 150, target: 20, metric: (r) => r.maxDepthM },
  { id: 'three', title: 'Doruč 3 truhlice během jednoho ponoru', reward: 350, target: 3, metric: delivered },
  { id: 'nohit', title: 'Vrať se s pokladem bez zásahu', reward: 250, target: 1, metric: (r) => (r.success && r.chests.length > 0 && r.hits === 0 ? 1 : 0) },
  { id: 'balloon', title: 'Doruč truhlici zvedacím balónem', reward: 300, target: 1, metric: (r) => r.banked.length },
  { id: 'pocket', title: 'Nadechni se ve vzduchové kapse', reward: 350, target: 1, metric: (r) => r.pockets },
  { id: 'rare', title: 'Doruč zlatou truhlici', reward: 300, target: 1, metric: (r) => deliveredKind(r, ['rare', 'epic', 'legendary']) },
  { id: 'o2', title: 'Dokonči ponor s pokladem a 30 % kyslíku', reward: 200, target: 1, metric: (r) => (r.success && r.chests.length > 0 && r.oxygenLeftPct >= 30 ? 1 : 0) },
  { id: 'earn1000', title: 'Vydělej celkem 1 000 $', reward: 400, target: 1000, cumulative: true, metric: (r) => (r.success ? r.total : 0) },
  { id: 'relic', title: 'Najdi první relikvii', reward: 600, target: 1, metric: (r) => r.relics.length },
  { id: 'depth50', title: 'Dosáhni hloubky 50 m', reward: 450, target: 50, metric: (r) => r.maxDepthM },
  { id: 'region2', title: 'Prozkoumej Blue Hole v Karibiku', reward: 500, target: 2, metric: (r) => (r.ocean === 'caribbean' ? r.regionMax : 0) },
  { id: 'greed', title: 'Doruč 4 truhlice najednou', reward: 900, target: 4, metric: (r) => (r.success ? r.chests.length : r.banked.length) },
  { id: 'challenge', title: 'Dokonči výzvu dne', reward: 500, target: 1, metric: (r) => (r.success && r.challenge ? 1 : 0) },
  { id: 'wreck', title: 'Doruč poklad ze Sunken Galleon', reward: 750, target: 1, metric: (r) => (r.success && r.ocean === 'caribbean' ? r.chests.filter((c) => c.regionId >= 4).length : 0) },
  { id: 'epic', title: 'Doruč vzácnou fialovou truhlici', reward: 900, target: 1, metric: (r) => deliveredKind(r, ['epic', 'legendary']) },
  { id: 'depth100', title: 'Dosáhni hloubky 100 m', reward: 1200, target: 100, metric: (r) => r.maxDepthM },
  { id: 'earn10000', title: 'Vydělej celkem 10 000 $', reward: 2000, target: 10000, cumulative: true, metric: (r) => (r.success ? r.total : 0) },
  { id: 'legend', title: 'Doruč starověkou truhlici', reward: 3000, target: 1, metric: (r) => deliveredKind(r, ['legendary']) },
  { id: 'ruins', title: 'Prozkoumej Legendary Cave', reward: 3000, target: 5, metric: (r) => (r.ocean === 'caribbean' ? r.regionMax : 0) },
  { id: 'boss', title: 'Ukradni poklad Megalodona', reward: 5000, target: 1, metric: (r) => (r.bossLoot ? 1 : 0) },
  { id: 'arctic', title: 'Ponoř se v Arktidě', reward: 2000, target: 1, metric: (r) => (r.ocean === 'arctic' && r.maxDepthM > 10 ? 1 : 0) },
  { id: 'atlantis', title: 'Prozkoumej Atlantidu až k Heart Chamber', reward: 8000, target: 5, metric: (r) => (r.ocean === 'atlantis' ? r.regionMax : 0) },
  { id: 'graveyard', title: 'Doruč poklad z Captain\'s Vault', reward: 10000, target: 1, metric: (r) => (r.success && r.ocean === 'graveyard' ? r.chests.filter((c) => c.regionId >= 4).length : 0) },
];

export const ACTIVE_MISSIONS = 3;

export function activeMissions(done: string[]): MissionDef[] {
  return MISSIONS.filter((m) => !done.includes(m.id)).slice(0, ACTIVE_MISSIONS);
}

export function applyMissions(
  result: DiveResult,
  done: string[],
  progress: Record<string, number>,
): { done: string[]; progress: Record<string, number>; completed: MissionDef[] } {
  const nextProgress = { ...progress };
  const nextDone = [...done];
  const completed: MissionDef[] = [];
  for (const mission of activeMissions(done)) {
    const value = mission.metric(result);
    const prev = nextProgress[mission.id] ?? 0;
    const updated = mission.cumulative ? prev + value : Math.max(prev, value);
    nextProgress[mission.id] = updated;
    if (updated >= mission.target) {
      nextDone.push(mission.id);
      completed.push(mission);
    }
  }
  return { done: nextDone, progress: nextProgress, completed };
}
