import type { DiveRecord, Drone } from './types';

export function newRecord(time: number, x: number, regionMax: number): DiveRecord {
  return { startTime: time, supplies: { medkit: 0, balloon: 0, harpoon: 0 }, maxDepth: 0, hits: 0, regionMax, fullWarned: -10, pockets: 0, balloonsSent: 0, minX: x, maxX: x, discoveries: [], photos: [], activated: [], cut: 0, materials: {}, scans: [], kitUsed: {}, escapes: 0, gates: 0, heavy: 0 };
}

export function newDrone(x: number, y: number): Drone {
  return { x, y, vx: 0, vy: 0, mode: 'dock', timer: 0, cooldown: 0, targetX: x, targetY: y, carry: null, mood: '', moodTime: 0, facing: 1, phase: 0 };
}
