import type { KitCounts, MaterialCounts } from './gear';
import type { OceanId } from './oceans';
import type { SpriteName } from '../render/spriteAssets';

export type ChestKind = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mystery' | 'jeweled' | 'heavy';
export type SharkKind = 'small' | 'reef' | 'hammer' | 'great' | 'deep' | 'mega' | 'orca' | 'leviathan' | 'abyssal' | 'maelstrom' | 'hollow';
export type HazardKind = 'jelly' | 'mine' | 'urchin' | 'octopus' | 'eel' | 'debris' | 'crab' | 'angler' | 'ray' | 'toxic' | 'spikes' | 'mimic' | 'barracuda' | 'siphon' | 'pistol' | 'shadow';
export type DamageSource = 'shark' | 'oxygen' | 'mine' | 'jelly' | 'urchin' | 'eel' | 'debris' | 'crab' | 'mega' | 'angler' | 'ray' | 'toxic' | 'spikes' | 'pressure' | 'cold' | 'heat' | 'guardian' | 'collapse' | 'barracuda' | 'siphon' | 'pistol' | 'shadow';
export type Condition = 'normal' | 'night' | 'storm' | 'gold';
export type ChallengeId = 'thin_air' | 'blind' | 'frenzy' | 'single' | 'night_owl';
export type RelicId = 'compass' | 'pearl' | 'trident' | 'mask' | 'coin' | 'horn' | 'idol' | 'map';
export type SkinId = 'classic' | 'coral' | 'reef' | 'royal';
export type SfxName =
  | 'swim'
  | 'bubbles'
  | 'splash'
  | 'collect'
  | 'chest_open'
  | 'coins'
  | 'shark'
  | 'hurt'
  | 'alarm'
  | 'boat_return'
  | 'success'
  | 'fail'
  | 'buy'
  | 'click'
  | 'mine'
  | 'zap'
  | 'drop'
  | 'waves'
  | 'horn'
  | 'pip'
  | 'crumble'
  | 'gate';

export interface Input {
  x: number;
  y: number;
}

export interface View {
  width: number;
  height: number;
}

export interface Stats {
  oxygenMax: number;
  speed: number;
  armor: number;
  capacity: number;
  sonarRange: number;
  light: number;
  ascent: number;
  boatSpeed: number;
  boatLevel: number;
  balloons: number;
  repellents: number;
  moneyBonus: number;
  magnet: number;
  insurance: number;
  medkits: number;
  harpoons: number;
  submarine: number;
  scooter: number;
  danger: number;
  sharkSpeed: number;
  lootBonus: number;
  safeDepth: number;
  thermal: number;
  cutter: number;
  camera: number;
  drain: number;
  drone: number;
  droneRange: number;
  crane: boolean;
  bell: boolean;
  net: boolean;
  reserve: boolean;
  deflect: boolean;
  quickStart: boolean;
  racer: boolean;
  riftArmor: boolean;
  lens: boolean;
  pipMagnet: boolean;
  harpoonRange: number;
  stormSail: boolean;
}

export interface Supplies {
  medkit: number;
  balloon: number;
  harpoon: number;
}

export interface DecorItem {
  key: string;
  sprite: SpriteName;
  x: number;
  y: number;
  width: number;
  flip: boolean;
  sway: number;
  front: boolean;
}

export interface Chunk {
  index: number;
  x0: number;
  decor: DecorItem[];
  profile: number[];
  top: number;
  regionId: number;
  palette: { sand: string; sandDark: string; sandEdge: string };
  cave: Cave | null;
  boss: boolean;
}

export interface Cave {
  x0: number;
  x1: number;
  bottom: number[];
  top: number[];
  pocket: { x: number; y: number; r: number } | null;
  unstable?: boolean;
  collapsed?: boolean;
}

export interface Chest {
  id: string;
  kind: ChestKind;
  x: number;
  y: number;
  restY: number;
  value: number;
  regionId: number;
  falling: boolean;
  vy: number;
  phase: number;
  pickupDelay: number;
  boss: boolean;
  inCave: boolean;
  relic: RelicId | null;
  rolled: boolean;
}

export interface CarriedChest {
  id: string;
  kind: ChestKind;
  value: number;
  weight: number;
  regionId: number;
  relic: RelicId | null;
  boss: boolean;
}

export interface Balloon {
  id: number;
  chest: CarriedChest;
  x: number;
  y: number;
  vx: number;
  vy: number;
  surfaced: boolean;
  phase: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  value: number;
  phase: number;
}

export type SharkMode = 'patrol' | 'chase' | 'lunge' | 'retreat' | 'telegraph' | 'charge' | 'tired';

export interface Shark {
  id: string;
  kind: SharkKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  range: number;
  facing: 1 | -1;
  mode: SharkMode;
  timer: number;
  hunter: boolean;
  phase: number;
  lungeCooldown: number;
  alert: number;
  turn: number;
  tilt: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  dying: number;
  hitFlash: number;
  exposed: boolean;
}

export interface Hazard {
  id: string;
  kind: HazardKind;
  x: number;
  y: number;
  homeX: number;
  baseY: number;
  anchorY: number;
  size: number;
  angle: number;
  phase: number;
  alive: boolean;
  dir: 1 | -1;
  timer: number;
  cooldown: number;
  state: number;
  vx: number;
  vy: number;
  link: string | null;
}

export interface Current {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  force: number;
  lift: number;
  tidal?: boolean;
}

export interface FishSchool {
  id: string;
  sprite: SpriteName;
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  count: number;
  phase: number;
  size: number;
}

export type ParticleKind = 'bubble' | 'spark' | 'coin' | 'streak' | 'boom' | 'splash' | 'cloud' | 'rain' | 'ink' | 'sand' | 'ring';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface HarpoonTarget {
  kind: 'shark' | 'hazard';
  id: string;
  x: number;
  y: number;
  boss: boolean;
}

export interface HarpoonShot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  target: { kind: 'shark' | 'hazard'; id: string } | null;
}

export interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export type DiverState = 'boat' | 'diving' | 'climbing' | 'rescue';

export interface Diver {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  health: number;
  oxygen: number;
  invuln: number;
  hurt: number;
  stun: number;
  carried: CarriedChest[];
  coins: number;
  state: DiverState;
  stateTime: number;
  collectFlash: number;
  anim: { kick: number; turn: number; tilt: number; idle: number; still: number };
  balloons: number;
  repellents: number;
  medkits: number;
  harpoons: number;
  atSub: boolean;
  cargo: string[];
  temp: number;
  breathing: boolean;
  inAir: boolean;
  kit: KitCounts;
  anchor: number;
  immune: number;
  tow: boolean;
  reserveUsed: boolean;
  deflectUsed: boolean;
  canisterUsed: boolean;
  bellUsed: boolean;
  turnBoost: number;
}

export interface DiveRecord {
  startTime: number;
  supplies: Supplies;
  maxDepth: number;
  hits: number;
  regionMax: number;
  fullWarned: number;
  pockets: number;
  balloonsSent: number;
  minX: number;
  maxX: number;
  discoveries: string[];
  photos: Photo[];
  activated: string[];
  cut: number;
  materials: MaterialCounts;
  scans: string[];
  kitUsed: KitCounts;
  escapes: number;
  gates: number;
  heavy: number;
}

export interface Photo {
  species: string;
  stars: number;
  behavior?: string;
}

export type PropKind =
  | 'fragment'
  | 'survivor'
  | 'artifact'
  | 'lever'
  | 'node'
  | 'echo'
  | 'vault'
  | 'guardian'
  | 'sealed'
  | 'beacon'
  | 'cargo'
  | 'merchant'
  | 'gate'
  | 'material'
  | 'rift'
  | 'shard'
  | 'vent'
  | 'dig'
  | 'chain'
  | 'heartstone'
  | 'bottle'
  | 'scan';

export interface PropSpec {
  id: string;
  kind: PropKind;
  x: number;
  lift: number;
  quest: string | null;
  sprite: SpriteName | null;
  active: boolean;
  value: number;
  tag?: string;
}

export interface Prop extends PropSpec {
  y: number;
  taken: boolean;
  progress: number;
  phase: number;
}

export type BoatEventKind = 'cargo' | 'merchant' | 'signal' | 'sos' | 'whales' | 'storm' | 'bottle';

export interface DiveResult {
  mode: GameMode;
  ocean: OceanId;
  delivered: string[];
  activated: string[];
  photos: Photo[];
  cut: number;
  rescueBonus: number;
  success: boolean;
  chests: CarriedChest[];
  coins: number;
  chestValue: number;
  depthBonus: number;
  noHitBonus: number;
  total: number;
  maxDepthM: number;
  hits: number;
  reason: DamageSource | null;
  lostValue: number;
  oxygenLeftPct: number;
  regionMax: number;
  duration: number;
  banked: CarriedChest[];
  bankedLost: number;
  multiplier: number;
  greedBonus: number;
  conditionBonus: number;
  relicBonus: number;
  expeditionBonus: number;
  insured: number;
  challengeBonus: number;
  relics: RelicId[];
  condition: Condition;
  challenge: ChallengeId | null;
  pockets: number;
  balloonsSent: number;
  bossLoot: boolean;
  minX: number;
  maxX: number;
  discoveries: string[];
  materials: MaterialCounts;
  materialsLost: MaterialCounts;
  kitUsed: KitCounts;
  scans: string[];
  escapes: number;
  gates: number;
  heavy: number;
  variant: GameVariant;
}

export type GameEvent =
  | { type: 'sfx'; name: SfxName; volume?: number }
  | { type: 'haptic'; kind: 'light' | 'heavy' | 'success' | 'warning' }
  | { type: 'finished'; result: DiveResult }
  | { type: 'locked' }
  | { type: 'toast'; text: string }
  | { type: 'merchant' }
  | { type: 'radio'; topic: string }
  | { type: 'cargo'; value: number }
  | { type: 'photo'; species: string; stars: number; prev: number }
  | { type: 'bottle' };

export type GamePhase = 'boat' | 'dive' | 'result';

export interface Camera {
  x: number;
  y: number;
  shake: number;
  offsetX: number;
  offsetY: number;
}

export type GameMode = 'sea' | 'endless';

export type GameVariant = 'normal' | 'free' | 'weekly' | 'legendary';

export type DroneMode = 'dock' | 'out' | 'scout' | 'return' | 'off';

export interface Drone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mode: DroneMode;
  timer: number;
  cooldown: number;
  targetX: number;
  targetY: number;
  carry: { kind: 'coins' | 'material' | 'shard'; value: number; material?: string; id?: string } | null;
  mood: string;
  moodTime: number;
  facing: 1 | -1;
  phase: number;
}

export interface Collapse {
  index: number;
  time: number;
  next: number;
}

export interface FallingRock {
  id: number;
  x: number;
  y: number;
  vy: number;
  warn: number;
  floor: number;
  size: number;
}

export interface BoatDecor {
  slot: string;
  sprite: string;
  x: number;
  y: number;
  width: number;
}

export interface Marker {
  id: number;
  kind: 'flare' | 'bait' | 'buoy';
  x: number;
  y: number;
  time: number;
}

export interface AirBubble {
  id: string;
  x: number;
  y: number;
  phase: number;
}

export interface GameState {
  mode: GameMode;
  ocean: OceanId;
  shaftSegments: Set<number>;
  airs: AirBubble[];
  shaftBest: number;
  shaftMark: number;
  seed: number;
  time: number;
  phase: GamePhase;
  diver: Diver;
  boat: { x: number; vx: number; lockedNotice: number; facing: 1 | -1; shown: 1 | -1; reverse: number; turnFx: number };
  camera: Camera;
  chunks: Map<number, Chunk>;
  chests: Chest[];
  coins: Coin[];
  sharks: Shark[];
  hazards: Hazard[];
  currents: Current[];
  fish: FishSchool[];
  particles: Particle[];
  texts: FloatText[];
  record: DiveRecord;
  stats: Stats;
  sonarTime: number;
  sonarCooldown: number;
  lastDamage: DamageSource | null;
  alarmTimer: number;
  bubbleTimer: number;
  swimTimer: number;
  sharkSoundTimer: number;
  textId: number;
  events: GameEvent[];
  balloons: Balloon[];
  inkTime: number;
  repelTime: number;
  sub: { x: number; y: number } | null;
  props: Prop[];
  photoCooldown: number;
  photoMode: number;
  photoAim: { x: number; y: number; stars: number } | null;
  harpoonShots: HarpoonShot[];
  harpoonAim: HarpoonTarget | null;
  harpoonCooldown: number;
  boatEvent: { kind: BoatEventKind; x: number } | null;
  sailed: number;
  supplies: Supplies;
  boostTime: number;
  boostCooldown: number;
  condition: Condition;
  challenge: ChallengeId | null;
  ownedRelics: RelicId[];
  skin: SkinId;
  seenChests: string[];
  entityId: number;
  variant: GameVariant;
  expansion: boolean;
  tideScale: number;
  tideHigh: boolean;
  tideWarned: boolean;
  drone: Drone;
  collapse: Collapse | null;
  rocks: FallingRock[];
  markers: Marker[];
  revealed: string[];
  kitSlot: number;
  reduceMotion: boolean;
  boatDecor: BoatDecor[];
  rarityShapes: boolean;
}
