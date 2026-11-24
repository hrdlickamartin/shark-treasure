import type { SkinId } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';

export interface SkinDef {
  id: SkinId;
  name: string;
  price: number;
  color: string;
}

export const SKINS: SkinDef[] = [
  { id: 'classic', name: 'Klasik', price: 0, color: '#1B2F5E' },
  { id: 'coral', name: 'Korál', price: 1500, color: '#C8323F' },
  { id: 'reef', name: 'Útes', price: 2500, color: '#2E8B3E' },
  { id: 'royal', name: 'Královský', price: 4000, color: '#6A2FA8' },
];

export const SKINNED: SpriteName[] = ['diver_swim1', 'diver_carry', 'diver_idle', 'diver_hurt', 'diver_climb', 'diver_swim_q', 'diver_carry_q'];

export function skinned(name: SpriteName, skin: SkinId): SpriteName {
  if (skin === 'classic' || !SKINNED.includes(name)) return name;
  return `${name}_${skin}` as SpriteName;
}
