import type { SpriteName } from '../render/spriteAssets';

export type ResearchId = 'lungs' | 'hydro' | 'alloy' | 'lining' | 'sonar' | 'appraisal' | 'medicine' | 'nets' | 'optics';

export interface ResearchDef {
  id: ResearchId;
  name: string;
  description: string;
  icon: SpriteName;
  cost: number;
  requires?: ResearchId;
}

export const RESEARCH: ResearchDef[] = [
  { id: 'lungs', name: 'Úsporné dýchání', description: '−12 % spotřeby kyslíku', icon: 'icon_o2', cost: 40 },
  { id: 'hydro', name: 'Hydrodynamika', description: '+8 % rychlost plavání', icon: 'icon_fins', cost: 50 },
  { id: 'nets', name: 'Nákladové sítě', description: '+1 místo na truhlici', icon: 'icon_net', cost: 80, requires: 'hydro' },
  { id: 'alloy', name: 'Tlakové slitiny', description: '+30 m bezpečné hloubky', icon: 'icon_pressure', cost: 70, requires: 'lungs' },
  { id: 'lining', name: 'Termální vrstva', description: '−30 % ztráty teploty', icon: 'icon_thermal', cost: 70, requires: 'lungs' },
  { id: 'optics', name: 'Podvodní optika', description: 'Lepší fotografie a dosah fotoaparátu', icon: 'icon_camera', cost: 60 },
  { id: 'sonar', name: 'Hlubinný sonar', description: '+35 % dosahu sonaru', icon: 'icon_sonar', cost: 90, requires: 'optics' },
  { id: 'appraisal', name: 'Oceňování nálezů', description: '+10 % hodnoty pokladů', icon: 'icon_trophy', cost: 120, requires: 'sonar' },
  { id: 'medicine', name: 'Polní medicína', description: '+1 lékárnička na každý ponor', icon: 'icon_medkit', cost: 100, requires: 'alloy' },
];

export function canResearch(def: ResearchDef, owned: string[], data: number): boolean {
  return !owned.includes(def.id) && data >= def.cost && (!def.requires || owned.includes(def.requires));
}

export function researchBonus(owned: string[]) {
  const has = (id: ResearchId) => owned.includes(id);
  return {
    drain: has('lungs') ? 0.88 : 1,
    speed: has('hydro') ? 0.08 : 0,
    capacity: has('nets') ? 1 : 0,
    depth: has('alloy') ? 30 : 0,
    thermal: has('lining') ? 0.7 : 1,
    camera: has('optics') ? 1 : 0,
    sonar: has('sonar') ? 0.35 : 0,
    loot: has('appraisal') ? 0.1 : 0,
    medkits: has('medicine') ? 1 : 0,
  };
}

export function explorerLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1;
}

export function levelXp(level: number): number {
  return (level - 1) * (level - 1) * 120;
}

export function levelReward(level: number): { money: number; pearls: number } {
  return { money: 250 * level, pearls: level % 5 === 0 ? 2 : 0 };
}
