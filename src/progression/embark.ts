import { OCEAN_ORDER } from '../game/oceans';
import { pearlsFor, perkLevel } from './expedition';
import type { SaveData } from './saveData';
import { EMPTY_LEVELS, maxLevel, unlocked, UPGRADES, type UpgradeLevels } from './upgrades';

export const embarkChapter = (expedition: number) => Math.min(OCEAN_ORDER.length, expedition + 1);

export const embarkEarnings = (expedition: number) => 20000 + expedition * 15000;

export function embarkRequirements(save: SaveData) {
  return {
    chapter: save.storyChapter >= embarkChapter(save.expedition),
    boss: save.run.boss,
    earned: save.run.earned >= embarkEarnings(save.expedition),
  };
}

export function canEmbark(save: SaveData): boolean {
  const req = embarkRequirements(save);
  return req.chapter && req.boss && req.earned;
}

export function embarkSave(save: SaveData): SaveData {
  const veteran = perkLevel(save.perks, 'veteran') > 0;
  const expedition = save.expedition + 1;
  const upgrades = { ...EMPTY_LEVELS, drone: save.upgrades.drone } as UpgradeLevels;
  for (const def of UPGRADES) {
    if (def.id === 'drone') continue;
    if (def.id === 'boat') upgrades.boat = Math.min(maxLevel(def, expedition), perkLevel(save.perks, 'shipwright'));
    else if (veteran && unlocked(def, expedition)) upgrades[def.id] = 1;
  }
  return {
    ...save,
    expedition,
    pearls: save.pearls + pearlsFor(save.run.earned, save.expedition),
    money: perkLevel(save.perks, 'capital') * 2000,
    upgrades,
    missionsDone: [],
    missionProgress: {},
    run: { earned: 0, boss: false },
    ocean: 'caribbean',
  };
}
