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
  { id: 'rare', title: 'Doruč zlatou truhlici', reward: 300, target: 1, metric: (r) => deliveredKind(r, ['rare', 'epic', 'legendary']) },
  { id: 'o2', title: 'Dokonči ponor s pokladem a 30 % kyslíku', reward: 200, target: 1, metric: (r) => (r.success && r.chests.length > 0 && r.oxygenLeftPct >= 30 ? 1 : 0) },
  { id: 'earn1000', title: 'Vydělej celkem 1 000 $', reward: 400, target: 1000, cumulative: true, metric: (r) => (r.success ? r.total : 0) },
  { id: 'depth50', title: 'Dosáhni hloubky 50 m', reward: 450, target: 50, metric: (r) => r.maxDepthM },
  { id: 'region2', title: 'Prozkoumej Shark Territory', reward: 500, target: 2, metric: (r) => r.regionMax },
  { id: 'wreck', title: 'Doruč poklad z oblasti Sunken Ship', reward: 750, target: 1, metric: (r) => (r.success ? r.chests.filter((c) => c.regionId >= 3).length : 0) },
  { id: 'epic', title: 'Doruč vzácnou fialovou truhlici', reward: 900, target: 1, metric: (r) => deliveredKind(r, ['epic', 'legendary']) },
  { id: 'depth100', title: 'Dosáhni hloubky 100 m', reward: 1200, target: 100, metric: (r) => r.maxDepthM },
  { id: 'earn10000', title: 'Vydělej celkem 10 000 $', reward: 2000, target: 10000, cumulative: true, metric: (r) => (r.success ? r.total : 0) },
  { id: 'legend', title: 'Doruč starověkou truhlici', reward: 3000, target: 1, metric: (r) => deliveredKind(r, ['legendary']) },
  { id: 'ruins', title: 'Prozkoumej Ancient Ruins', reward: 3000, target: 5, metric: (r) => r.regionMax },
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
