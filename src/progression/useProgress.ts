import { useCallback, useEffect, useRef, useState } from 'react';
import type { DiveResult } from '../game/types';
import { applyMissions, type MissionDef } from './missions';
import { DEFAULT_SAVE, loadSave, type SaveData, writeSave } from './save';
import { UPGRADES, upgradeCost, type UpgradeId } from './upgrades';

export interface ResultSummary {
  result: DiveResult;
  missions: MissionDef[];
  missionReward: number;
}

export function useProgress() {
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [loaded, setLoaded] = useState(false);
  const saveRef = useRef(save);

  useEffect(() => {
    loadSave().then((data) => {
      saveRef.current = data;
      setSave(data);
      setLoaded(true);
    });
  }, []);

  const commit = useCallback((next: SaveData) => {
    saveRef.current = next;
    setSave(next);
    writeSave(next);
  }, []);

  const buy = useCallback(
    (id: UpgradeId): boolean => {
      const current = saveRef.current;
      const def = UPGRADES.find((u) => u.id === id)!;
      const level = current.upgrades[id];
      if (level >= def.max) return false;
      const cost = upgradeCost(def, level);
      if (current.money < cost) return false;
      commit({ ...current, money: current.money - cost, upgrades: { ...current.upgrades, [id]: level + 1 } });
      return true;
    },
    [commit],
  );

  const applyResult = useCallback(
    (result: DiveResult): ResultSummary => {
      const current = saveRef.current;
      const missions = applyMissions(result, current.missionsDone, current.missionProgress);
      const missionReward = missions.completed.reduce((sum, m) => sum + m.reward, 0);
      commit({
        ...current,
        money: current.money + result.total + missionReward,
        missionsDone: missions.done,
        missionProgress: missions.progress,
        stats: {
          dives: current.stats.dives + 1,
          successes: current.stats.successes + (result.success ? 1 : 0),
          totalEarned: current.stats.totalEarned + result.total + missionReward,
          bestDepth: Math.max(current.stats.bestDepth, result.maxDepthM),
          chests: current.stats.chests + (result.success ? result.chests.length : 0),
        },
      });
      return { result, missions: missions.completed, missionReward };
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<SaveData['settings']>) => {
      const current = saveRef.current;
      commit({ ...current, settings: { ...current.settings, ...patch } });
    },
    [commit],
  );

  const markTutorial = useCallback(() => {
    commit({ ...saveRef.current, tutorialSeen: true });
  }, [commit]);

  const reset = useCallback(() => {
    commit({ ...DEFAULT_SAVE, settings: saveRef.current.settings });
  }, [commit]);

  return { save, loaded, buy, applyResult, updateSettings, markTutorial, reset };
}
