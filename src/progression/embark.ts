import { pearlsFor, perkLevel } from './expedition';
import type { SaveData } from './saveData';
import { EMPTY_LEVELS, maxLevel, unlocked, UPGRADES, type UpgradeLevels } from './upgrades';

export function canEmbark(save: SaveData): boolean {
  const boat = UPGRADES.find((u) => u.id === 'boat')!;
  return save.upgrades.boat >= maxLevel(boat, save.expedition) && save.run.boss;
}

export function embarkSave(save: SaveData): SaveData {
  const veteran = perkLevel(save.perks, 'veteran') > 0;
  const expedition = save.expedition + 1;
  const upgrades = { ...EMPTY_LEVELS } as UpgradeLevels;
  for (const def of UPGRADES) {
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
