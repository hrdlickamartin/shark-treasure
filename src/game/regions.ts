export interface Region {
  id: number;
  name: string;
  subtitle: string;
  start: number;
  baseDepth: number;
  amplitude: number;
  sand: string;
  sandDark: string;
  sandEdge: string;
}

export const REGIONS: Region[] = [
  { id: 0, name: 'Sunny Reef', subtitle: 'Mělká voda, písek', start: 0, baseDepth: 175, amplitude: 28, sand: '#F2D08A', sandDark: '#D9AE5F', sandEdge: '#B8873F' },
  { id: 1, name: 'Coral Bay', subtitle: 'Korály, první žraloci', start: 1700, baseDepth: 380, amplitude: 80, sand: '#E9C27C', sandDark: '#C99A55', sandEdge: '#9C7038' },
  { id: 2, name: 'Shark Territory', subtitle: 'Více žraloků', start: 3800, baseDepth: 560, amplitude: 100, sand: '#C9AE84', sandDark: '#9E8460', sandEdge: '#6E5A40' },
  { id: 3, name: 'Sunken Ship', subtitle: 'Vraky a překážky', start: 6400, baseDepth: 820, amplitude: 120, sand: '#9C8F78', sandDark: '#6F6656', sandEdge: '#4A4438' },
  { id: 4, name: 'Deep Ocean', subtitle: 'Velká hloubka, tma', start: 9400, baseDepth: 1180, amplitude: 150, sand: '#5B6A86', sandDark: '#3C4862', sandEdge: '#252E42' },
  { id: 5, name: 'Ancient Ruins', subtitle: 'Starověké poklady', start: 12800, baseDepth: 1380, amplitude: 160, sand: '#6E6A8E', sandDark: '#4A4668', sandEdge: '#2C2944' },
];

export function regionIndexAt(x: number): number {
  const d = Math.abs(x);
  let index = 0;
  for (let i = 0; i < REGIONS.length; i++) if (d >= REGIONS[i].start) index = i;
  return index;
}

export const regionAt = (x: number): Region => REGIONS[regionIndexAt(x)];

export const regionLimit = (unlocked: number): number => REGIONS[unlocked + 1]?.start ?? Number.POSITIVE_INFINITY;
