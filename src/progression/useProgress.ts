import { useCallback, useEffect, useRef, useState } from 'react';
import type { OceanId } from '../game/oceans';
import type { DiveResult, SkinId } from '../game/types';
import { SKINS } from './skins';
import { DEFAULT_SAVE, loadSave, type SaveData, writeSave } from './save';
import { canEmbark, embarkSave } from './embark';
import { applyChoice, applyDive, type ResultSummary } from './progress';
import type { Line } from './characters';
import { dialogueFor } from './dialogue';
import { questById } from './quests';
import { canResearch, RESEARCH } from './research';
import type { Ending } from './saveData';
import { endingAvailable, ENDINGS } from './story';
import { PERKS, perkCost, perkLevel, type PerkId } from './expedition';
import { maxLevel, unlocked, UPGRADES, upgradeCost, type UpgradeId } from './upgrades';

export type { ResultSummary } from './progress';

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
      if (level >= maxLevel(def, current.expedition) || !unlocked(def, current.expedition)) return false;
      const cost = upgradeCost(def, level);
      if (current.money < cost) return false;
      commit({ ...current, money: current.money - cost, upgrades: { ...current.upgrades, [id]: level + 1 } });
      return true;
    },
    [commit],
  );

  const applyResult = useCallback(
    (result: DiveResult): ResultSummary => {
      const { save: next, summary } = applyDive(saveRef.current, result);
      commit(next);
      return summary;
    },
    [commit],
  );

  const learn = useCallback(
    (id: string): boolean => {
      const current = saveRef.current;
      const def = RESEARCH.find((r) => r.id === id);
      if (!def || !canResearch(def, current.research, current.researchData)) return false;
      commit({ ...current, researchData: current.researchData - def.cost, research: [...current.research, def.id] });
      return true;
    },
    [commit],
  );

  const travel = useCallback(
    (ocean: OceanId): boolean => {
      const current = saveRef.current;
      if (!current.oceans.includes(ocean)) return false;
      commit({ ...current, ocean });
      return true;
    },
    [commit],
  );

  const addMoney = useCallback(
    (amount: number) => {
      const current = saveRef.current;
      commit({ ...current, money: current.money + amount, stats: { ...current.stats, totalEarned: current.stats.totalEarned + amount } });
    },
    [commit],
  );

  const buySupplies = useCallback(
    (price: number): boolean => {
      const current = saveRef.current;
      if (current.money < price) return false;
      const s = current.supplies;
      commit({ ...current, money: current.money - price, supplies: { medkit: s.medkit + 1, balloon: s.balloon + 1, harpoon: s.harpoon + 1 } });
      return true;
    },
    [commit],
  );

  const chooseEnding = useCallback(
    (ending: Ending) => {
      const current = saveRef.current;
      if (current.ending || !endingAvailable(ending, current)) return;
      const reward = ENDINGS[ending].reward;
      const upgrades = ending === 'sacrifice' ? { ...current.upgrades, boat: Math.max(0, current.upgrades.boat - 2) } : current.upgrades;
      const flags = ending === 'power' ? [...current.flags, 'anomalies'] : current.flags;
      commit({ ...current, ending, upgrades, flags, money: current.money + reward.money, pearls: current.pearls + reward.pearls, researchData: current.researchData + reward.research });
    },
    [commit],
  );

  const dismissDialog = useCallback(
    (id: string) => {
      const current = saveRef.current;
      const met = [...new Set([...current.met, ...(dialogueFor(id)?.lines.map((l) => l.who) ?? [])])];
      commit({ ...current, met, pendingDialogs: current.pendingDialogs.filter((d) => d !== id) });
    },
    [commit],
  );

  const choose = useCallback(
    (questId: string, optionId: string): Line[] | null => {
      const current = saveRef.current;
      const settled = applyChoice(current, questId, optionId);
      if (!settled) return null;
      commit(settled.save);
      return questById(questId)?.choice?.options.find((o) => o.id === optionId)?.result ?? [];
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

  const buySkin = useCallback(
    (id: SkinId): boolean => {
      const current = saveRef.current;
      if (current.skins.includes(id)) {
        commit({ ...current, skin: id });
        return true;
      }
      const def = SKINS.find((s) => s.id === id)!;
      if (current.money < def.price) return false;
      commit({ ...current, money: current.money - def.price, skins: [...current.skins, id], skin: id });
      return true;
    },
    [commit],
  );

  const embark = useCallback((): boolean => {
    const current = saveRef.current;
    if (!canEmbark(current)) return false;
    commit(embarkSave(current));
    return true;
  }, [commit]);

  const buyPerk = useCallback(
    (id: PerkId): boolean => {
      const current = saveRef.current;
      const def = PERKS.find((p) => p.id === id)!;
      const level = perkLevel(current.perks, id);
      const cost = perkCost(def, level);
      if (cost === null || current.pearls < cost) return false;
      commit({ ...current, pearls: current.pearls - cost, perks: { ...current.perks, [id]: level + 1 } });
      return true;
    },
    [commit],
  );

  const markTutorial = useCallback(() => {
    commit({ ...saveRef.current, tutorialSeen: true });
  }, [commit]);

  const reset = useCallback(() => {
    commit({ ...DEFAULT_SAVE, settings: saveRef.current.settings });
  }, [commit]);

  return { save, loaded, buy, buySkin, buyPerk, embark, applyResult, learn, travel, addMoney, buySupplies, chooseEnding, dismissDialog, choose, updateSettings, markTutorial, reset };
}
