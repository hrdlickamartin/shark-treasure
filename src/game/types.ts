import type { SpriteName } from '../render/spriteAssets';

export type ChestKind = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mystery';
export type SharkKind = 'small' | 'reef' | 'hammer' | 'great' | 'deep';
export type HazardKind = 'jelly' | 'mine' | 'urchin';
export type DamageSource = 'shark' | 'oxygen' | 'mine' | 'jelly' | 'urchin';
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
  | 'waves';

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
  boatLimit: number;
  boatLevel: number;
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
}

export interface CarriedChest {
  id: string;
  kind: ChestKind;
  value: number;
  weight: number;
  regionId: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  value: number;
  phase: number;
}

export type SharkMode = 'patrol' | 'chase' | 'lunge' | 'retreat';

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
}

export interface Hazard {
  id: string;
  kind: HazardKind;
  x: number;
  y: number;
  baseY: number;
  anchorY: number;
  phase: number;
  alive: boolean;
}

export interface Current {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  force: number;
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

export type ParticleKind = 'bubble' | 'spark' | 'coin' | 'streak' | 'boom' | 'splash';

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
}

export interface DiveRecord {
  startTime: number;
  maxDepth: number;
  hits: number;
  regionMax: number;
  fullWarned: number;
}

export interface DiveResult {
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
}

export type GameEvent =
  | { type: 'sfx'; name: SfxName; volume?: number }
  | { type: 'haptic'; kind: 'light' | 'heavy' | 'success' | 'warning' }
  | { type: 'finished'; result: DiveResult }
  | { type: 'locked' };

export type GamePhase = 'boat' | 'dive' | 'result';

export interface Camera {
  x: number;
  y: number;
  shake: number;
  offsetX: number;
  offsetY: number;
}

export interface GameState {
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
}
