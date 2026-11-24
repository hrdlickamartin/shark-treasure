import type { BackgroundName } from '../render/spriteAssets';
import { CHUNK_W } from './constants';
import type { MaterialCounts } from './gear';
import type { Region } from './regions';
import type { SharkKind } from './types';

export type OceanId = 'caribbean' | 'arctic' | 'mediterranean' | 'pacific' | 'atlantis' | 'abyss' | 'graveyard' | 'volcanic' | 'riptide' | 'wandering';

export type Temperature = 'cold' | 'heat';
export type Puzzle = 'levers' | 'nodes';

export interface OceanBackground {
  name: BackgroundName;
  depth: number;
}

export interface OceanDef {
  id: OceanId;
  name: string;
  czech: string;
  subtitle: string;
  port: string;
  mechanic: string;
  regions: Region[];
  backgrounds: OceanBackground[];
  bossRegion: number | null;
  boss: SharkKind;
  sharks?: Partial<Record<SharkKind, number>>;
  temperature?: Temperature;
  fog?: number;
  darkness?: number;
  currents?: number;
  sealed?: boolean;
  puzzle?: Puzzle;
  puzzleRegion?: number;
  vaultRegion?: number;
  recommended: { pressure: number; thermal: number; light: number; cutter: number };
  map: { x: number; y: number };
  water: string;
  materials: MaterialCounts;
  tide?: { period: number; strength: number };
  moving?: boolean;
  vents?: boolean;
  mimics?: number;
  heavy?: number;
  unstable?: number;
  expansion?: boolean;
}

const STARTS = [0, 1600, 3300, 5200, 7200, 9400];

function zones(rows: Omit<Region, 'id' | 'start'>[]): Region[] {
  return rows.map((row, i) => ({ ...row, id: i, start: STARTS[i] }));
}

const REEF = ['coral_pink', 'coral_orange', 'seaweed', 'seaweed', 'rock_small', 'coral_pink', 'kelp'];
const ICE = ['ice_crystal', 'ice_block', 'rock_small', 'kelp', 'ice_crystal', 'rock_big'];
const MARBLE = ['marble_column', 'amphora', 'rock_small', 'seaweed', 'coral_orange', 'amphora'];
const KELP = ['giant_kelp', 'giant_kelp', 'coral_pink', 'coral_orange', 'seaweed', 'rock_big', 'coral_purple'];
const ATLANTIS = ['city_pillar', 'glow_coral', 'rock_small', 'city_pillar', 'coral_purple'];
const DEEP = ['glow_coral', 'glow_coral', 'rock_big', 'kelp', 'rock_small', 'coral_purple'];
const RUST = ['rock_big', 'kelp', 'seaweed', 'rock_small', 'kelp'];
const MAGMA = ['lava_vent', 'rock_big', 'rock_small', 'cave_crystal', 'rock_big'];
const GLOW_FRONT = ['glow_coral', 'rock_small'];
const STRAIT = ['rock_big', 'rock_small', 'kelp', 'seaweed', 'rock_big', 'coral_orange'];
const SHELL = ['coral_pink', 'coral_purple', 'seaweed', 'coral_pink', 'glow_coral', 'kelp', 'coral_orange'];
const SHELL_FRONT = ['coral_pink', 'seaweed', 'coral_purple'];

export const OCEANS: Record<OceanId, OceanDef> = {
  caribbean: {
    id: 'caribbean',
    name: 'Caribbean Sea',
    czech: 'Karibik',
    subtitle: 'Tropické vody, piráti a první fragment',
    port: 'Port Royal',
    mechanic: 'Výchozí region: vraky, jeskyně a Megalodon v Legendary Cave.',
    regions: zones([
      { name: 'Coral Garden', subtitle: 'Bezpečný útes', baseDepth: 175, amplitude: 28, sand: '#F2D08A', sandDark: '#D9AE5F', sandEdge: '#B8873F', tier: 0, decor: REEF, landmarks: [], caves: false },
      { name: 'Pirate Bay', subtitle: 'První vrak s pokladem', baseDepth: 360, amplitude: 70, sand: '#E9C27C', sandDark: '#C99A55', sandEdge: '#9C7038', tier: 1, decor: REEF, landmarks: [{ decor: 'wreck', chance: 0.35 }], caves: true },
      { name: 'Blue Hole', subtitle: 'Vertikální jeskyně', baseDepth: 560, amplitude: 120, sand: '#C9AE84', sandDark: '#9E8460', sandEdge: '#6E5A40', tier: 2, decor: ['rock_big', 'seaweed', 'kelp', 'coral_orange', 'rock_small', 'coral_purple'], landmarks: [], caves: true, caveChance: 0.45 },
      { name: 'Shark Territory', subtitle: 'Nebezpečná zóna', baseDepth: 640, amplitude: 100, sand: '#B9A27E', sandDark: '#8E7A5A', sandEdge: '#5E4E38', tier: 3, decor: RUST, landmarks: [], caves: false, sharks: { reef: 40, hammer: 35, great: 25 } },
      { name: 'Sunken Galleon', subtitle: 'Vícestupňový vrak', baseDepth: 820, amplitude: 120, sand: '#9C8F78', sandDark: '#6F6656', sandEdge: '#4A4438', tier: 3, decor: RUST, landmarks: [{ decor: 'wreck', chance: 0.6 }], caves: true },
      { name: 'Legendary Cave', subtitle: 'Doupě Megalodona', baseDepth: 980, amplitude: 140, sand: '#6E6A8E', sandDark: '#4A4668', sandEdge: '#2C2944', tier: 5, decor: ['rock_big', 'coral_purple', 'kelp', 'rock_small'], landmarks: [{ decor: 'ruins', chance: 0.45 }], caves: true },
    ]),
    backgrounds: [
      { name: 'bg_shallow', depth: 0 },
      { name: 'bg_coral', depth: 25 },
      { name: 'bg_wreck', depth: 60 },
      { name: 'bg_deep', depth: 110 },
    ],
    bossRegion: 5,
    boss: 'mega',
    recommended: { pressure: 1, thermal: 0, light: 0, cutter: 0 },
    map: { x: 0.17, y: 0.27 },
    water: '#0A5FB0',
    materials: { scrap: 3, rope: 3, nacre: 1 },
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Frontier',
    czech: 'Arktida',
    subtitle: 'Led, mlha a ztracená expedice',
    port: 'Ice Harbor',
    mechanic: 'Chlad: ve vodě ubývá teplota. Ohřej se u hladiny nebo u topných majáků. Snížená viditelnost.',
    regions: zones([
      { name: 'Ice Harbor', subtitle: 'Základna výzkumníků', baseDepth: 260, amplitude: 40, sand: '#DDEBF5', sandDark: '#AFC7DB', sandEdge: '#7E9AB5', tier: 1, decor: ICE, front: ['ice_crystal', 'rock_small'], landmarks: [], caves: false },
      { name: 'Frozen Shelf', subtitle: 'Trhliny a ledové stěny', baseDepth: 480, amplitude: 110, sand: '#CFE0EE', sandDark: '#9BB5CC', sandEdge: '#6A87A3', tier: 2, decor: ICE, front: ['ice_crystal', 'rock_small'], landmarks: [{ decor: 'ice_block', chance: 0.5 }], caves: true },
      { name: 'Polar Wreck', subtitle: 'Vrak pod ledem', baseDepth: 700, amplitude: 110, sand: '#BCCFE0', sandDark: '#8AA3BB', sandEdge: '#5C7690', tier: 3, decor: ICE, front: ['ice_crystal', 'rock_small'], landmarks: [{ decor: 'wreck', chance: 0.55 }], caves: false },
      { name: 'Research Station 9', subtitle: 'Ztracená základna', baseDepth: 820, amplitude: 90, sand: '#B2C6D8', sandDark: '#8099B0', sandEdge: '#556E86', tier: 3, decor: ICE, front: ['ice_crystal', 'rock_small'], landmarks: [{ decor: 'ice_block', chance: 0.4 }], caves: true },
      { name: 'Ice Cavern', subtitle: 'Krystalické jeskyně', baseDepth: 980, amplitude: 140, sand: '#A6BCD2', sandDark: '#7590AA', sandEdge: '#4D6680', tier: 4, decor: ['ice_crystal', 'ice_crystal', 'cave_crystal', 'rock_big'], front: ['ice_crystal', 'rock_small'], landmarks: [], caves: true, caveChance: 0.4 },
      { name: 'Leviathan Passage', subtitle: 'Setkání s obřím tvorem', baseDepth: 1150, amplitude: 150, sand: '#93A9C2', sandDark: '#647D99', sandEdge: '#3F5570', tier: 5, decor: ICE, front: ['ice_crystal', 'rock_small'], landmarks: [{ decor: 'ice_block', chance: 0.5 }], caves: false, relicBoost: 1.3 },
    ]),
    backgrounds: [
      { name: 'bg_arctic', depth: 0 },
      { name: 'bg_deep', depth: 100 },
    ],
    bossRegion: 5,
    boss: 'leviathan',
    sharks: { orca: 55, reef: 25, great: 20 },
    temperature: 'cold',
    fog: 0.28,
    recommended: { pressure: 2, thermal: 1, light: 1, cutter: 0 },
    map: { x: 0.47, y: 0.13 },
    water: '#3E7FB8',
    materials: { ice: 4, scrap: 1 },
  },
  mediterranean: {
    id: 'mediterranean',
    name: 'Mediterranean Secrets',
    czech: 'Středomoří',
    subtitle: 'Antické ruiny a hádanky',
    port: 'Sunken Agora',
    mechanic: 'Starověký zámek: aktivuj páky v Chrámu Poseidonově a otevři Kyklopovu klenotnici.',
    regions: zones([
      { name: 'Sunken Agora', subtitle: 'Zatopené tržiště', baseDepth: 220, amplitude: 40, sand: '#EED9A8', sandDark: '#D4B77D', sandEdge: '#A8874E', tier: 1, decor: MARBLE, landmarks: [{ decor: 'ruins', chance: 0.25 }], caves: false },
      { name: 'Amphora Fields', subtitle: 'Pole historických artefaktů', baseDepth: 400, amplitude: 60, sand: '#E6CD98', sandDark: '#C9A970', sandEdge: '#9C7C45', tier: 1, decor: ['amphora', 'amphora', 'rock_small', 'seaweed', 'marble_column'], landmarks: [], caves: false },
      { name: 'Roman Fleet', subtitle: 'Flotila vraků', baseDepth: 600, amplitude: 100, sand: '#D6BE8E', sandDark: '#B39867', sandEdge: '#86703F', tier: 2, decor: MARBLE, landmarks: [{ decor: 'wreck', chance: 0.55 }], caves: true },
      { name: 'The Lighthouse', subtitle: 'Příběhová lokace', baseDepth: 720, amplitude: 90, sand: '#C9B083', sandDark: '#A38A5E', sandEdge: '#76613B', tier: 3, decor: MARBLE, landmarks: [{ decor: 'marble_column', chance: 0.5 }], caves: false },
      { name: 'Temple of Poseidon', subtitle: 'Chrámové puzzle', baseDepth: 860, amplitude: 110, sand: '#B9A27E', sandDark: '#8E7A5A', sandEdge: '#5E4E38', tier: 3, decor: MARBLE, landmarks: [{ decor: 'city_statue', chance: 0.45 }, { decor: 'ruins', chance: 0.35 }], caves: false },
      { name: 'Cyclops Vault', subtitle: 'Tajná komnata', baseDepth: 1000, amplitude: 120, sand: '#A69070', sandDark: '#7C6A4F', sandEdge: '#4F4332', tier: 4, decor: MARBLE, landmarks: [{ decor: 'ruins', chance: 0.5 }], caves: true, relicBoost: 1.3 },
    ]),
    backgrounds: [
      { name: 'bg_mediterranean', depth: 0 },
      { name: 'bg_wreck', depth: 70 },
    ],
    bossRegion: null,
    boss: 'mega',
    puzzle: 'levers',
    puzzleRegion: 4,
    vaultRegion: 5,
    recommended: { pressure: 2, thermal: 0, light: 0, cutter: 0 },
    map: { x: 0.75, y: 0.22 },
    water: '#1D8FC9',
    materials: { rope: 2, nacre: 2, scrap: 1 },
  },
  pacific: {
    id: 'pacific',
    name: 'Pacific Wilds',
    czech: 'Tichomoří',
    subtitle: 'Obří útesy, proudy a velryby',
    port: 'Reef Kingdom',
    mechanic: 'Silné proudy mění směr ponoru. Velryby a obří fauna k fotografování.',
    regions: zones([
      { name: 'Reef Kingdom', subtitle: 'Rozsáhlý útes', baseDepth: 240, amplitude: 50, sand: '#F0D49A', sandDark: '#D3B06C', sandEdge: '#A7823F', tier: 1, decor: KELP, landmarks: [], caves: false, whales: 0.12 },
      { name: 'Whale Route', subtitle: 'Pozorování velryb', baseDepth: 480, amplitude: 80, sand: '#DCC08A', sandDark: '#B9995F', sandEdge: '#8C6C38', tier: 2, decor: KELP, landmarks: [], caves: false, whales: 0.55 },
      { name: 'Giant Kelp Forest', subtitle: 'Husté porosty', baseDepth: 640, amplitude: 100, sand: '#C2AD7E', sandDark: '#988459', sandEdge: '#6A5A3A', tier: 3, decor: ['giant_kelp', 'giant_kelp', 'giant_kelp', 'kelp', 'rock_big'], front: ['giant_kelp', 'seaweed'], landmarks: [], caves: false },
      { name: 'Storm Island', subtitle: 'Nebezpečné počasí', baseDepth: 760, amplitude: 120, sand: '#A99A7A', sandDark: '#7F7258', sandEdge: '#544A38', tier: 3, decor: KELP, landmarks: [], caves: true },
      { name: 'Volcanic Reef', subtitle: 'Tepelné průduchy', baseDepth: 900, amplitude: 140, sand: '#8A7A6A', sandDark: '#5F5348', sandEdge: '#3A322B', tier: 4, decor: ['rock_big', 'coral_purple', 'kelp', 'rock_small'], landmarks: [{ decor: 'trench_vent', chance: 0.55 }], caves: false },
      { name: 'Pearl Caverns', subtitle: 'Vzácné perly', baseDepth: 1060, amplitude: 130, sand: '#7A7896', sandDark: '#55536E', sandEdge: '#343248', tier: 5, decor: DEEP, front: GLOW_FRONT, landmarks: [], caves: true, caveChance: 0.5, relicBoost: 1.3 },
    ]),
    backgrounds: [
      { name: 'bg_pacific', depth: 0 },
      { name: 'bg_coral', depth: 50 },
      { name: 'bg_deep', depth: 100 },
    ],
    bossRegion: null,
    boss: 'mega',
    currents: 2.2,
    recommended: { pressure: 2, thermal: 0, light: 1, cutter: 0 },
    map: { x: 0.42, y: 0.55 },
    water: '#0C6FC4',
    materials: { nacre: 4, rope: 1 },
  },
  atlantis: {
    id: 'atlantis',
    name: 'Atlantis',
    czech: 'Atlantida',
    subtitle: 'Ztracené město a původ artefaktu',
    port: 'Outer Ruins',
    mechanic: 'Energetické uzly: aktivuj je v Energy Gardens, uklidníš Strážce a otevřeš Heart Chamber.',
    regions: zones([
      { name: 'Outer Ruins', subtitle: 'První průzkum', baseDepth: 1200, amplitude: 90, sand: '#6E6A8E', sandDark: '#4A4668', sandEdge: '#2C2944', tier: 4, decor: ATLANTIS, front: GLOW_FRONT, landmarks: [{ decor: 'ruins', chance: 0.5 }], caves: false },
      { name: 'The Archives', subtitle: 'Záznamy civilizace', baseDepth: 1400, amplitude: 110, sand: '#5E6690', sandDark: '#40476C', sandEdge: '#C9A24A', tier: 5, decor: ATLANTIS, front: GLOW_FRONT, landmarks: [{ decor: 'city_statue', chance: 0.4 }], caves: true },
      { name: 'Energy Gardens', subtitle: 'Energetické sítě', baseDepth: 1600, amplitude: 120, sand: '#4E5C92', sandDark: '#34406E', sandEdge: '#C9A24A', tier: 5, decor: ['glow_coral', 'glow_coral', 'city_pillar', 'coral_purple'], front: GLOW_FRONT, landmarks: [], caves: false },
      { name: 'Royal District', subtitle: 'Příběhové centrum', baseDepth: 1800, amplitude: 120, sand: '#4E5C92', sandDark: '#34406E', sandEdge: '#C9A24A', tier: 6, decor: ATLANTIS, front: GLOW_FRONT, landmarks: [{ decor: 'city_statue', chance: 0.5 }, { decor: 'ruins', chance: 0.3 }], caves: false, relicBoost: 1.5 },
      { name: 'Guardian Arena', subtitle: 'Strážce města', baseDepth: 2000, amplitude: 100, sand: '#46538A', sandDark: '#2E3966', sandEdge: '#C9A24A', tier: 6, decor: ATLANTIS, front: GLOW_FRONT, landmarks: [{ decor: 'city_statue', chance: 0.6 }], caves: false },
      { name: 'Heart Chamber', subtitle: 'Hlavní odhalení', baseDepth: 2200, amplitude: 110, sand: '#3F4C82', sandDark: '#28335E', sandEdge: '#E0B84E', tier: 7, decor: ATLANTIS, front: GLOW_FRONT, landmarks: [{ decor: 'ruins', chance: 0.45 }], caves: false, relicBoost: 1.6 },
    ]),
    backgrounds: [
      { name: 'bg_deep', depth: 0 },
      { name: 'bg_city', depth: 120 },
    ],
    bossRegion: null,
    boss: 'mega',
    sharks: { deep: 60, great: 40 },
    puzzle: 'nodes',
    puzzleRegion: 2,
    vaultRegion: 5,
    darkness: 0.15,
    recommended: { pressure: 4, thermal: 0, light: 2, cutter: 0 },
    map: { x: 0.6, y: 0.8 },
    water: '#123A78',
    materials: { alloy: 1, nacre: 2, biogel: 1 },
  },
  abyss: {
    id: 'abyss',
    name: 'The Abyss',
    czech: 'Propast',
    subtitle: 'Tma, tlak a neznámí tvorové',
    port: 'Drop Zone',
    mechanic: 'Téměř úplná tma: bez světla a sonaru se neorientuješ. Obrovský tlak.',
    regions: zones([
      { name: 'Drop Zone', subtitle: 'Sestup do propasti', baseDepth: 1500, amplitude: 160, sand: '#4A3F78', sandDark: '#322A5C', sandEdge: '#1E1840', tier: 5, decor: DEEP, front: GLOW_FRONT, landmarks: [{ decor: 'trench_vent', chance: 0.3 }], caves: false },
      { name: 'Black Canyon', subtitle: 'Hluboký kaňon', baseDepth: 1900, amplitude: 260, sand: '#3E3468', sandDark: '#2A2350', sandEdge: '#18133A', tier: 6, decor: DEEP, front: GLOW_FRONT, landmarks: [{ decor: 'trench_vent', chance: 0.5 }], caves: false },
      { name: 'Echo Chamber', subtitle: 'Sonarová hádanka', baseDepth: 2200, amplitude: 180, sand: '#3A3060', sandDark: '#272048', sandEdge: '#161234', tier: 6, decor: DEEP, front: GLOW_FRONT, landmarks: [], caves: true },
      { name: 'Abyssal Station', subtitle: 'Výzkumná stanice', baseDepth: 2500, amplitude: 160, sand: '#352C58', sandDark: '#231D42', sandEdge: '#14102E', tier: 7, decor: DEEP, front: GLOW_FRONT, landmarks: [{ decor: 'wreck', chance: 0.35 }], caves: false },
      { name: 'The Silent Field', subtitle: 'Zóna ticha', baseDepth: 2800, amplitude: 140, sand: '#302850', sandDark: '#201A3C', sandEdge: '#120E2A', tier: 7, decor: DEEP, front: GLOW_FRONT, landmarks: [], caves: false },
      { name: 'Unknown Nest', subtitle: 'Setkání s neznámým', baseDepth: 3100, amplitude: 160, sand: '#2B2348', sandDark: '#1C1736', sandEdge: '#100C26', tier: 7, decor: DEEP, front: GLOW_FRONT, landmarks: [{ decor: 'trench_vent', chance: 0.4 }], caves: false, relicBoost: 1.6 },
    ]),
    backgrounds: [
      { name: 'bg_deep', depth: 0 },
      { name: 'bg_trench', depth: 150 },
    ],
    bossRegion: 5,
    boss: 'abyssal',
    sharks: { deep: 70, great: 30 },
    darkness: 0.35,
    recommended: { pressure: 6, thermal: 0, light: 3, cutter: 0 },
    map: { x: 0.42, y: 0.9 },
    water: '#0A1E4A',
    materials: { biogel: 4, scrap: 1 },
  },
  graveyard: {
    id: 'graveyard',
    name: 'Ship Graveyard',
    czech: 'Hřbitov lodí',
    subtitle: 'Labyrint vraků a osud dědečka',
    port: 'Outer Graveyard',
    mechanic: 'Zapečetěné truhly otevřeš jen řezákem. Nebezpečné proudy mezi vraky.',
    regions: zones([
      { name: 'Outer Graveyard', subtitle: 'První vraky', baseDepth: 700, amplitude: 90, sand: '#8C8A7A', sandDark: '#646254', sandEdge: '#3E3C33', tier: 3, decor: RUST, landmarks: [{ decor: 'wreck', chance: 0.6 }], caves: false },
      { name: 'Cargo Maze', subtitle: 'Kontejnerový labyrint', baseDepth: 900, amplitude: 120, sand: '#7E7C70', sandDark: '#58564C', sandEdge: '#36352E', tier: 4, decor: RUST, landmarks: [{ decor: 'wreck', chance: 0.7 }], caves: true },
      { name: 'Ghost Ship', subtitle: 'Tajemná loď', baseDepth: 1100, amplitude: 110, sand: '#6E7468', sandDark: '#4C5147', sandEdge: '#2E322B', tier: 5, decor: RUST, landmarks: [{ decor: 'ghost_ship', chance: 0.6 }], caves: false },
      { name: 'Lost Expedition', subtitle: 'Stopy rodiny', baseDepth: 1300, amplitude: 130, sand: '#5E6660', sandDark: '#404642', sandEdge: '#262A27', tier: 6, decor: RUST, landmarks: [{ decor: 'wreck', chance: 0.6 }], caves: false },
      { name: "Captain's Vault", subtitle: 'Legendární poklad', baseDepth: 1500, amplitude: 140, sand: '#4E5450', sandDark: '#343936', sandEdge: '#1E211F', tier: 7, decor: RUST, landmarks: [{ decor: 'ghost_ship', chance: 0.35 }, { decor: 'wreck', chance: 0.4 }], caves: true, relicBoost: 1.5 },
    ]),
    backgrounds: [
      { name: 'bg_graveyard', depth: 0 },
      { name: 'bg_deep', depth: 120 },
    ],
    bossRegion: null,
    boss: 'mega',
    sharks: { great: 45, reef: 25, deep: 30 },
    sealed: true,
    currents: 1.6,
    fog: 0.15,
    recommended: { pressure: 4, thermal: 0, light: 2, cutter: 1 },
    map: { x: 0.17, y: 0.78 },
    water: '#2E5560',
    materials: { scrap: 4, rope: 2 },
  },
  volcanic: {
    id: 'volcanic',
    name: 'Volcanic Depths',
    czech: 'Vulkanické hlubiny',
    subtitle: 'Magma, žár a finální sestup',
    port: 'Magma Fields',
    mechanic: 'Žár: ve vodě se přehříváš. Ochlaď se u hladiny nebo u chladicích krystalů. Gejzíry vynášejí vzhůru.',
    regions: zones([
      { name: 'Magma Fields', subtitle: 'Lávové průduchy', baseDepth: 1400, amplitude: 140, sand: '#4A3A3A', sandDark: '#2E2222', sandEdge: '#FF7A2F', tier: 5, decor: MAGMA, front: ['rock_small'], landmarks: [{ decor: 'lava_vent', chance: 0.6 }], caves: false },
      { name: 'Thermal Maze', subtitle: 'Teplotní bludiště', baseDepth: 1700, amplitude: 200, sand: '#443434', sandDark: '#2A1F1F', sandEdge: '#FF6A1F', tier: 6, decor: MAGMA, front: ['rock_small'], landmarks: [{ decor: 'lava_vent', chance: 0.6 }], caves: true },
      { name: 'Obsidian Cavern', subtitle: 'Vzácné minerály', baseDepth: 2000, amplitude: 160, sand: '#3A2C30', sandDark: '#241A1E', sandEdge: '#C84FFF', tier: 6, decor: ['cave_crystal', 'cave_crystal', 'rock_big', 'lava_vent'], front: ['rock_small'], landmarks: [], caves: true, caveChance: 0.45, relicBoost: 1.4 },
      { name: 'Core Rift', subtitle: 'Nestabilní oblast', baseDepth: 2300, amplitude: 240, sand: '#3E2828', sandDark: '#271818', sandEdge: '#FF5A1A', tier: 7, decor: MAGMA, front: ['rock_small'], landmarks: [{ decor: 'lava_vent', chance: 0.7 }], caves: false },
      { name: 'Final Descent', subtitle: 'Finální expedice', baseDepth: 2600, amplitude: 160, sand: '#352222', sandDark: '#211414', sandEdge: '#FFB02F', tier: 7, decor: MAGMA, front: ['rock_small'], landmarks: [{ decor: 'ruins', chance: 0.4 }, { decor: 'lava_vent', chance: 0.4 }], caves: false, relicBoost: 1.6 },
    ]),
    backgrounds: [{ name: 'bg_volcanic', depth: 0 }],
    bossRegion: null,
    boss: 'mega',
    sharks: { deep: 50, hammer: 25, great: 25 },
    temperature: 'heat',
    darkness: 0.1,
    recommended: { pressure: 5, thermal: 3, light: 2, cutter: 0 },
    map: { x: 0.87, y: 0.6 },
    water: '#3A1A14',
    materials: { obsidian: 4, scrap: 1 },
  },
  riptide: {
    id: 'riptide',
    name: 'Riptide Straits',
    czech: 'Úžina proudů',
    subtitle: 'Řeka v oceánu, přílivové brány a Vládce proudů',
    port: 'Kotviště Tern',
    mechanic: 'Příliv: proudy se každých 30 s otočí a zesílí. Přílivové brány jsou otevřené jen při přílivu nebo po zatažení páky.',
    regions: zones([
      { name: 'Kotviště Tern', subtitle: 'Plovoucí molo frakcí', baseDepth: 260, amplitude: 50, sand: '#B9B4A8', sandDark: '#8F887C', sandEdge: '#5F594F', tier: 2, decor: STRAIT, landmarks: [], caves: false },
      { name: 'Závodní kanál', subtitle: 'Rovný kanál se silným proudem', baseDepth: 420, amplitude: 60, sand: '#AFA99C', sandDark: '#857E71', sandEdge: '#574F44', tier: 3, decor: STRAIT, landmarks: [{ decor: 'wreck', chance: 0.25 }], caves: false },
      { name: 'Přílivové brány', subtitle: 'Atlantská stavidla', baseDepth: 560, amplitude: 90, sand: '#A49E92', sandDark: '#7A7367', sandEdge: '#4E473D', tier: 3, decor: STRAIT, landmarks: [{ decor: 'ruins', chance: 0.3 }], caves: true, caveChance: 0.2 },
      { name: 'Barakudí rokle', subtitle: 'Hejna v liniích', baseDepth: 760, amplitude: 130, sand: '#958F84', sandDark: '#6C665C', sandEdge: '#433E36', tier: 4, decor: STRAIT, landmarks: [], caves: true, caveChance: 0.3 },
      { name: 'Vírová pánev', subtitle: 'Vraky v kruhovém proudu', baseDepth: 880, amplitude: 110, sand: '#8A847A', sandDark: '#625C53', sandEdge: '#3D3832', tier: 4, decor: STRAIT, landmarks: [{ decor: 'wreck', chance: 0.55 }], caves: false },
      { name: 'Oko víru', subtitle: 'Doupě Vládce proudů', baseDepth: 1000, amplitude: 120, sand: '#7A756C', sandDark: '#55504A', sandEdge: '#34302B', tier: 5, decor: ['rock_big', 'rock_small', 'kelp'], landmarks: [{ decor: 'ruins', chance: 0.4 }], caves: false },
    ]),
    backgrounds: [
      { name: 'bg_riptide', depth: 0 },
      { name: 'bg_trench', depth: 100 },
    ],
    bossRegion: 5,
    boss: 'maelstrom',
    sharks: { reef: 40, hammer: 35, great: 25 },
    currents: 2.4,
    tide: { period: 60, strength: 1 },
    recommended: { pressure: 2, thermal: 0, light: 0, cutter: 0 },
    map: { x: 0.64, y: 0.43 },
    water: '#1E6C9C',
    materials: { rope: 3, scrap: 3, nacre: 2 },
    heavy: 0.12,
    unstable: 0.3,
    expansion: true,
  },
  wandering: {
    id: 'wandering',
    name: 'The Wandering Reef',
    czech: 'Putující útes',
    subtitle: 'Útes na hřbetě Strážce proudů',
    port: 'Junova plošina',
    mechanic: 'Útes se pohybuje: každý ponor začíná jinde. Dýchací průduchy doplňují kyslík, dutiny pod krunýřem se hroutí.',
    regions: zones([
      { name: 'Okraj krunýře', subtitle: 'Symbiotické ryby a první průduchy', baseDepth: 220, amplitude: 40, sand: '#EADFC8', sandDark: '#CDBB98', sandEdge: '#9E8B67', tier: 2, decor: SHELL, front: SHELL_FRONT, landmarks: [], caves: false },
      { name: 'Dýchací pole', subtitle: 'Řada dýchacích průduchů', baseDepth: 380, amplitude: 70, sand: '#E2D4BA', sandDark: '#C2AE8A', sandEdge: '#927E5B', tier: 3, decor: SHELL, front: SHELL_FRONT, landmarks: [], caves: true, caveChance: 0.25 },
      { name: 'Zahrady symbiontů', subtitle: 'Mimikry mezi truhlami', baseDepth: 520, amplitude: 90, sand: '#D9C9AC', sandDark: '#B8A27D', sandEdge: '#887251', tier: 3, decor: SHELL, front: SHELL_FRONT, landmarks: [], caves: true, caveChance: 0.3 },
      { name: 'Rány krunýře', subtitle: 'Prasklé pláty a parazité', baseDepth: 640, amplitude: 100, sand: '#CDBB9C', sandDark: '#AA9370', sandEdge: '#7B6548', tier: 4, decor: SHELL, front: SHELL_FRONT, landmarks: [], caves: true, caveChance: 0.4 },
      { name: 'Dutina galeony', subtitle: 'Vrak zaklíněný mezi pláty', baseDepth: 780, amplitude: 120, sand: '#BFAB8C', sandDark: '#9A8462', sandEdge: '#6B573D', tier: 4, decor: SHELL, front: SHELL_FRONT, landmarks: [{ decor: 'wreck', chance: 0.6 }], caves: true, caveChance: 0.5 },
      { name: 'Srdeční jeskyně', subtitle: 'Srdeční kámen Strážce', baseDepth: 900, amplitude: 120, sand: '#AE9A7C', sandDark: '#887356', sandEdge: '#5B4934', tier: 5, decor: ['glow_coral', 'coral_purple', 'rock_big', 'cave_crystal'], front: SHELL_FRONT, landmarks: [{ decor: 'tidewarden', chance: 0.35 }], caves: true, caveChance: 0.5 },
    ]),
    backgrounds: [
      { name: 'bg_reef_back', depth: 0 },
      { name: 'bg_rift', depth: 85 },
    ],
    bossRegion: 4,
    boss: 'hollow',
    sharks: { reef: 50, great: 30, deep: 20 },
    currents: 1.2,
    tide: { period: 90, strength: 0.6 },
    darkness: 0.1,
    recommended: { pressure: 2, thermal: 0, light: 1, cutter: 1 },
    map: { x: 0.3, y: 0.42 },
    water: '#3C8CA0',
    materials: { nacre: 3, biogel: 3, rope: 1 },
    moving: true,
    vents: true,
    mimics: 0.3,
    heavy: 0.18,
    unstable: 0.6,
    expansion: true,
  },
};

export const OCEAN_ORDER: OceanId[] = ['caribbean', 'arctic', 'mediterranean', 'pacific', 'atlantis', 'abyss', 'graveyard', 'volcanic'];

export const EXPANSION_OCEANS: OceanId[] = ['riptide', 'wandering'];

export const WORLD_OCEANS: OceanId[] = [...OCEAN_ORDER, ...EXPANSION_OCEANS];

export const DEFAULT_TIDE = { period: 90, strength: 0.3 };

const REEF_ROUTE = [
  { x: 0.3, y: 0.42 },
  { x: 0.55, y: 0.66 },
  { x: 0.72, y: 0.48 },
  { x: 0.5, y: 0.3 },
  { x: 0.24, y: 0.6 },
];

export const weekIndex = (date = new Date()) => Math.floor((date.getTime() / 86400000 + 3) / 7);

export function mapPosition(ocean: OceanDef, week = weekIndex()): { x: number; y: number } {
  if (!ocean.moving) return ocean.map;
  return REEF_ROUTE[((week % REEF_ROUTE.length) + REEF_ROUTE.length) % REEF_ROUTE.length];
}

export function reefShift(dives: number): number {
  return ((dives % 5) - 2) * CHUNK_W;
}

export const DEFAULT_OCEAN: OceanId = 'caribbean';

export const oceanOf = (state: { ocean: OceanId }): OceanDef => OCEANS[state.ocean];

export const oceanEnd = (ocean: OceanDef): number => ocean.regions[ocean.regions.length - 1].start + 2400;

export function bossChunks(ocean: OceanDef): number[] {
  if (ocean.bossRegion === null) return [];
  const start = ocean.regions[ocean.bossRegion].start;
  return [Math.ceil(start / CHUNK_W), -Math.ceil(start / CHUNK_W) - 1];
}
