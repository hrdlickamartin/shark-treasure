import type { SpriteName } from '../render/spriteAssets';

export type MaterialId = 'scrap' | 'rope' | 'nacre' | 'ice' | 'obsidian' | 'biogel' | 'alloy';

export interface MaterialInfo {
  id: MaterialId;
  name: string;
  sprite: SpriteName;
  source: string;
}

export const MATERIALS: Record<MaterialId, MaterialInfo> = {
  scrap: { id: 'scrap', name: 'Kovový šrot', sprite: 'mat_scrap', source: 'Vraky, náklad, trosky' },
  rope: { id: 'rope', name: 'Lana a plachtovina', sprite: 'mat_rope', source: 'Vraky, ztracený náklad' },
  nacre: { id: 'nacre', name: 'Perleť', sprite: 'mat_nacre', source: 'Mušle na dně, krunýř Strážce' },
  ice: { id: 'ice', name: 'Ledový krystal', sprite: 'mat_ice', source: 'Ledové bloky v Arktidě' },
  obsidian: { id: 'obsidian', name: 'Obsidián', sprite: 'mat_obsidian', source: 'Lávové průduchy' },
  biogel: { id: 'biogel', name: 'Biogel', sprite: 'mat_biogel', source: 'Bioluminiscenční tvorové, krunýř' },
  alloy: { id: 'alloy', name: 'Atlantská slitina', sprite: 'mat_alloy', source: 'Trhliny Srdce, Atlantida' },
};

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export type KitId = 'flare' | 'bait' | 'canister' | 'anchor' | 'buoy' | 'tow' | 'antidote' | 'sprint';

export interface KitInfo {
  id: KitId;
  name: string;
  icon: SpriteName;
  effect: string;
}

export const KIT: Record<KitId, KitInfo> = {
  flare: { id: 'flare', name: 'Signální světlice', icon: 'icon_flare', effect: 'Na 20 s rozsvítí okolí a odplaší tvory ze tmy' },
  bait: { id: 'bait', name: 'Žraločí návnada', icon: 'icon_bait', effect: 'Na 8 s přitáhne žraloky k místu hodu' },
  canister: { id: 'canister', name: 'Kyslíková patrona', icon: 'icon_canister', effect: '+25 % kyslíku, jednou za ponor' },
  anchor: { id: 'anchor', name: 'Proudová kotva', icon: 'icon_anchor', effect: 'Na 6 s tě ukotví proti proudu' },
  buoy: { id: 'buoy', name: 'Sonarová bóje', icon: 'tide_buoy', effect: 'Položí značku viditelnou z dálky' },
  tow: { id: 'tow', name: 'Vlečné lano', icon: 'crane_hook', effect: 'Pošle těžkou truhlu rovnou k lodi' },
  antidote: { id: 'antidote', name: 'Protijed', icon: 'mat_biogel', effect: 'Na 10 s odolnost vůči jedu a žahnutí' },
  sprint: { id: 'sprint', name: 'Sprintová bomba', icon: 'icon_scooter', effect: '3 s plné rychlosti bez nabíjení' },
};

export const KIT_IDS = Object.keys(KIT) as KitId[];

export type KitCounts = Partial<Record<KitId, number>>;
export type MaterialCounts = Partial<Record<MaterialId, number>>;

export const FLARE_TIME = 20;
export const FLARE_RADIUS = 300;
export const BAIT_TIME = 8;
export const ANCHOR_TIME = 6;
export const ANTIDOTE_TIME = 10;
export const SPRINT_TIME = 3;
export const CANISTER_SHARE = 0.25;

export function addCounts<T extends string>(a: Partial<Record<T, number>>, b: Partial<Record<T, number>>, sign = 1): Partial<Record<T, number>> {
  const out: Partial<Record<T, number>> = { ...a };
  for (const [key, value] of Object.entries(b) as [T, number][]) {
    const next = (out[key] ?? 0) + sign * value;
    if (next > 0) out[key] = next;
    else delete out[key];
  }
  return out;
}

export const countOf = <T extends string>(counts: Partial<Record<T, number>>, key: T) => counts[key] ?? 0;
