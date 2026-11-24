import type { OceanId } from '../game/oceans';
import type { SpriteName } from '../render/spriteAssets';

export interface Species {
  id: string;
  name: string;
  sprite: SpriteName;
  group: 'Žraloci' | 'Tvorové' | 'Ryby' | 'Legendy';
  oceans: OceanId[] | 'all';
  research: number;
}

export const SPECIES: Species[] = [
  { id: 'small', name: 'Malý žralok', sprite: 'shark_small', group: 'Žraloci', oceans: 'all', research: 8 },
  { id: 'reef', name: 'Útesový žralok', sprite: 'shark_reef', group: 'Žraloci', oceans: 'all', research: 10 },
  { id: 'hammer', name: 'Kladivoun', sprite: 'shark_hammer', group: 'Žraloci', oceans: ['caribbean', 'pacific', 'volcanic'], research: 14 },
  { id: 'great', name: 'Velký bílý žralok', sprite: 'shark_great', group: 'Žraloci', oceans: 'all', research: 18 },
  { id: 'deep', name: 'Hlubinný žralok', sprite: 'shark_deep', group: 'Žraloci', oceans: ['abyss', 'graveyard', 'volcanic', 'atlantis'], research: 20 },
  { id: 'orca', name: 'Kosatka', sprite: 'orca', group: 'Žraloci', oceans: ['arctic'], research: 22 },
  { id: 'jelly', name: 'Medúza', sprite: 'jellyfish', group: 'Tvorové', oceans: 'all', research: 8 },
  { id: 'octopus', name: 'Chobotnice', sprite: 'octopus', group: 'Tvorové', oceans: 'all', research: 12 },
  { id: 'eel', name: 'Muréna', sprite: 'eel', group: 'Tvorové', oceans: 'all', research: 12 },
  { id: 'crab', name: 'Krab strážce', sprite: 'crab', group: 'Tvorové', oceans: 'all', research: 10 },
  { id: 'urchin', name: 'Mořský ježek', sprite: 'urchin', group: 'Tvorové', oceans: 'all', research: 6 },
  { id: 'ray', name: 'Elektrický rejnok', sprite: 'electric_ray', group: 'Tvorové', oceans: 'all', research: 16 },
  { id: 'angler', name: 'Ďas', sprite: 'anglerfish', group: 'Tvorové', oceans: ['atlantis', 'abyss', 'volcanic', 'graveyard'], research: 20 },
  { id: 'fish_clown', name: 'Klaun očkatý', sprite: 'fish_clown', group: 'Ryby', oceans: ['caribbean', 'pacific', 'mediterranean'], research: 5 },
  { id: 'fish_yellow', name: 'Žlutá rybka', sprite: 'fish_yellow', group: 'Ryby', oceans: 'all', research: 5 },
  { id: 'fish_blue', name: 'Modrá rybka', sprite: 'fish_blue', group: 'Ryby', oceans: 'all', research: 5 },
  { id: 'whale', name: 'Keporkak', sprite: 'whale', group: 'Ryby', oceans: ['pacific'], research: 40 },
  { id: 'mega', name: 'Megalodon', sprite: 'megalodon', group: 'Legendy', oceans: ['caribbean'], research: 60 },
  { id: 'leviathan', name: 'Leviatan', sprite: 'leviathan', group: 'Legendy', oceans: ['arctic'], research: 70 },
  { id: 'guardian', name: 'Strážce Atlantidy', sprite: 'guardian', group: 'Legendy', oceans: ['atlantis'], research: 70 },
  { id: 'abyssal', name: 'Tvor z hlubin', sprite: 'abyssal_creature', group: 'Legendy', oceans: ['abyss'], research: 90 },
  { id: 'barracuda', name: 'Barakuda', sprite: 'barracuda', group: 'Ryby', oceans: ['riptide', 'pacific'], research: 18 },
  { id: 'siphon', name: 'Řetězová medúza', sprite: 'siphon', group: 'Tvorové', oceans: ['riptide', 'pacific', 'wandering'], research: 22 },
  { id: 'pistol', name: 'Krevetka pistolník', sprite: 'pistol_shrimp', group: 'Tvorové', oceans: ['wandering', 'pacific'], research: 20 },
  { id: 'mimic', name: 'Mimikry chobotnice', sprite: 'mimic_octopus', group: 'Tvorové', oceans: 'all', research: 30 },
  { id: 'shadow', name: 'Trhlinový stín', sprite: 'rift_shadow', group: 'Legendy', oceans: 'all', research: 45 },
  { id: 'tidewarden_young', name: 'Mladý Strážce', sprite: 'tidewarden_young', group: 'Legendy', oceans: ['wandering'], research: 60 },
  { id: 'vent', name: 'Dýchací průduch', sprite: 'reef_vent', group: 'Legendy', oceans: ['wandering'], research: 25 },
  { id: 'maelstrom', name: 'Vládce proudů', sprite: 'maelstrom_eel', group: 'Legendy', oceans: ['riptide'], research: 80 },
  { id: 'hollow', name: 'Dutá ulita', sprite: 'hollow_shell', group: 'Legendy', oceans: ['wandering'], research: 80 },
];

export const speciesById = (id: string): Species | undefined => SPECIES.find((s) => s.id === id);

export interface PhotoReward {
  research: number;
  xp: number;
  improved: string[];
}

export function applyPhotos(book: Record<string, number>, photos: { species: string; stars: number }[]): { book: Record<string, number>; reward: PhotoReward } {
  const next = { ...book };
  const reward: PhotoReward = { research: 0, xp: 0, improved: [] };
  for (const photo of photos) {
    const species = speciesById(photo.species);
    if (!species) continue;
    const before = next[photo.species] ?? 0;
    if (photo.stars <= before) continue;
    next[photo.species] = photo.stars;
    reward.research += before === 0 ? species.research : Math.round(species.research * 0.3);
    reward.xp += before === 0 ? 40 : 15;
    reward.improved.push(photo.species);
  }
  return { book: next, reward };
}

export function photoMessage(book: Record<string, number>, species: string, stars: number, prev: number, forQuest: string | null): string {
  if (!species) return 'Fotka je prázdná – přibliž se k tvorovi a plav směrem k němu.';
  const def = speciesById(species);
  if (!def) return 'Fotka pořízena.';
  const best = Math.max(book[species] ?? 0, prev);
  const quest = forQuest ? ` • Úkol: ${forQuest}` : '';
  if (best === 0) return `Nový druh: ${def.name} (${stars}/3) – po návratu +${def.research} dat a 40 XP${quest}`;
  if (stars > best) return `Lepší fotka: ${def.name} ${best}/3 → ${stars}/3 – po návratu +${Math.round(def.research * 0.3)} dat${quest}`;
  return `${def.name} ${stars}/3 – v katalogu už máš ${best}/3. Zkus to blíž a v klidu.${quest}`;
}
