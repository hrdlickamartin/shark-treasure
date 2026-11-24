import { Image, StyleSheet, Text, View } from 'react-native';
import { CHESTS } from '../game/catalog';
import { MATERIALS, type MaterialId } from '../game/gear';
import { clamp } from '../game/rng';
import { barracudaMembers, siphonSegments } from '../game/systems/fauna';
import { bellSpot } from '../game/systems/extras';
import { HOOK_Y } from '../game/systems/haul';
import { RIFT_RADIUS, ventExhaling, VENT_HEIGHT } from '../game/systems/props';
import { GATE_HEIGHT } from '../game/systems/tide';
import { SCOUT_RADIUS } from '../game/systems/drone';
import type { Drone, FallingRock, GameState, Hazard, Marker, Prop } from '../game/types';
import { COLORS, FONTS, textShadow } from '../ui/theme';
import { RigSprite } from './RigSprite';
import { Sprite, spriteHeight } from './Sprite';
import { SPRITES, type SpriteName } from './spriteAssets';

function SoftGlow({ x, y, r, color, opacity }: { x: number; y: number; r: number; color: string; opacity: number }) {
  return (
    <>
      {[1, 0.72, 0.45].map((k) => (
        <View key={k} style={{ position: 'absolute', left: x - r * k, top: y - r * k, width: r * 2 * k, height: r * 2 * k, borderRadius: r * k, backgroundColor: color, opacity: opacity * 0.4 }} />
      ))}
    </>
  );
}

export function MimicView({ hazard, time }: { hazard: Hazard; time: number }) {
  const breathe = Math.sin(time * 2.4 + hazard.phase) * 0.05;
  if (hazard.state === 2) {
    const t = clamp(hazard.timer / 1.4, 0, 1);
    return <Sprite name="mimic_octopus" x={hazard.x} y={hazard.y} width={70} rotate={Math.sin(time * 12) * 12} opacity={t} />;
  }
  const revealed = hazard.state === 1;
  return (
    <>
      {revealed && <View style={[styles.glow, { left: hazard.x - 46, top: hazard.y - 46, width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.purple, opacity: 0.35 + Math.sin(time * 5) * 0.1 }]} />}
      <Sprite name={revealed ? 'mimic_octopus' : 'chest_common'} x={hazard.x} y={hazard.y} width={revealed ? 60 : CHESTS.common.width} scaleX={1 + breathe} scaleY={1 - breathe} />
    </>
  );
}

export function BarracudaView({ hazard }: { hazard: Hazard }) {
  const members = barracudaMembers(hazard);
  return (
    <>
      {members.map((m, i) => (
        <Sprite key={i} name="barracuda" x={m.x} y={m.y} width={74} flip={hazard.dir < 0} rotate={Math.sin(hazard.phase * 8 + i) * 3} scaleY={1 + Math.sin(hazard.phase * 10 + i) * 0.04} />
      ))}
    </>
  );
}

export function SiphonView({ hazard, time }: { hazard: Hazard; time: number }) {
  const segments = siphonSegments(hazard);
  return (
    <>
      {segments.slice(1).map((s, i) => (
        <View key={`l${i}`} style={[styles.siphonLink, { left: Math.min(s.x, segments[i].x), top: (s.y + segments[i].y) / 2 - 1, width: Math.abs(s.x - segments[i].x) }]} />
      ))}
      {segments.map((s, i) => {
        const pulse = Math.sin(time * 3 + i * 0.9) * 0.08;
        return <Sprite key={i} name="siphon" x={s.x} y={s.y} width={40 - i * 2} scaleX={1 - pulse} scaleY={1 + pulse} opacity={0.92} />;
      })}
    </>
  );
}

export function PistolView({ hazard, time }: { hazard: Hazard; time: number }) {
  const aiming = hazard.state === 1;
  const snap = hazard.state === 2;
  const clawX = hazard.x + hazard.dir * 26;
  return (
    <>
      {aiming && <View style={[styles.glow, { left: clawX - 22, top: hazard.y - 22, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFE45C', opacity: 0.4 + Math.sin(time * 30) * 0.2 }]} />}
      <Sprite name="pistol_shrimp" x={hazard.x} y={hazard.y} width={58} flip={hazard.dir < 0} rotate={aiming ? Math.sin(time * 40) * 3 : snap ? -hazard.dir * 8 : Math.sin(hazard.phase * 2) * 2} />
    </>
  );
}

export function ShadowView({ hazard }: { hazard: Hazard }) {
  const lit = hazard.state === 1;
  return (
    <RigSprite
      name="rift_shadow"
      x={hazard.x}
      y={hazard.y}
      width={150}
      scaleX={hazard.dir}
      rotate={clamp(hazard.vy * 0.1, -12, 12) * hazard.dir}
      angles={[Math.sin(hazard.phase * 5) * 6, Math.sin(hazard.phase * 5 - 1.2) * 16]}
      opacity={lit ? 0.9 : 0.38 + Math.sin(hazard.phase * 2) * 0.08}
    />
  );
}

export function TideHazardView({ hazard, time }: { hazard: Hazard; time: number }) {
  switch (hazard.kind) {
    case 'mimic':
      return <MimicView hazard={hazard} time={time} />;
    case 'barracuda':
      return <BarracudaView hazard={hazard} />;
    case 'siphon':
      return <SiphonView hazard={hazard} time={time} />;
    case 'pistol':
      return <PistolView hazard={hazard} time={time} />;
    case 'shadow':
      return <ShadowView hazard={hazard} />;
    default:
      return null;
  }
}

const GATE_WIDTH = GATE_HEIGHT * SPRITES.tidal_gate.aspect;

function GateView({ prop, time }: { prop: Prop; time: number }) {
  const open = prop.active;
  const sink = prop.phase * GATE_HEIGHT * 0.86;
  return (
    <>
      <View style={[styles.gateSlot, { left: prop.x - GATE_WIDTH * 0.2, top: prop.y - GATE_HEIGHT, width: GATE_WIDTH * 0.4, height: GATE_HEIGHT, opacity: open ? 0.25 : 0 }]} />
      <View style={{ position: 'absolute', left: prop.x - GATE_WIDTH / 2, top: prop.y - GATE_HEIGHT, width: GATE_WIDTH, height: GATE_HEIGHT, overflow: 'hidden' }}>
        <Image source={SPRITES.tidal_gate.source} fadeDuration={0} style={{ position: 'absolute', left: 0, top: sink, width: GATE_WIDTH, height: GATE_HEIGHT }} />
      </View>
      {prop.progress > 0 && (
        <View style={[styles.timerBar, { left: prop.x - 30, top: prop.y - GATE_HEIGHT - 18 }]}>
          <View style={[styles.timerFill, { width: 60 * clamp(prop.progress / 20, 0, 1) }]} />
        </View>
      )}
      {!open && Math.sin(time * 4) > 0.6 && <View style={[styles.gateWarn, { left: prop.x - 5, top: prop.y - GATE_HEIGHT - 16 }]} />}
    </>
  );
}

function MaterialView({ prop, time }: { prop: Prop; time: number }) {
  const bob = Math.sin(prop.phase * 2) * 3;
  const sprite = MATERIALS[prop.tag as MaterialId]?.sprite ?? 'mat_scrap';
  return (
    <>
      <View style={[styles.glow, { left: prop.x - 26, top: prop.y + bob - 26, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.gold, opacity: 0.16 + Math.sin(time * 3 + prop.phase) * 0.06 }]} />
      <Sprite name={sprite} x={prop.x} y={prop.y + bob} width={34} rotate={Math.sin(prop.phase * 1.4) * 8} />
      {prop.value > 1 && <Text style={[styles.badge, { left: prop.x + 8, top: prop.y + bob - 26 }]}>×{prop.value}</Text>}
    </>
  );
}

function RiftView({ prop, time }: { prop: Prop; time: number }) {
  const size = RIFT_RADIUS * 1.3;
  return (
    <>
      <View style={[styles.riftEdge, { left: prop.x - RIFT_RADIUS, top: prop.y - RIFT_RADIUS, width: RIFT_RADIUS * 2, height: RIFT_RADIUS * 2, borderRadius: RIFT_RADIUS, transform: [{ rotate: `${(time * 20) % 360}deg` }] }]} />
      <Sprite name="rift_portal" x={prop.x} y={prop.y} width={size} rotate={(time * 14) % 360} opacity={0.42 + Math.sin(time * 1.6) * 0.08} />
    </>
  );
}

function VentView({ prop, time }: { prop: Prop; time: number }) {
  const exhale = ventExhaling(prop);
  const t = (prop.progress % 8) / 3;
  return (
    <>
      {exhale && (
        <View style={[styles.ventColumn, { left: prop.x - 34, top: prop.y - VENT_HEIGHT, height: VENT_HEIGHT, opacity: 0.18 + Math.sin(Math.PI * clamp(t, 0, 1)) * 0.22 }]} />
      )}
      <Sprite name="reef_vent" x={prop.x} y={prop.y + 6} width={76} anchor="bottom" scaleY={1 + (exhale ? Math.sin(time * 6) * 0.06 : 0)} />
    </>
  );
}

function ChainView({ prop, time }: { prop: Prop; time: number }) {
  const links = 9;
  return (
    <>
      {Array.from({ length: links }, (_, i) => (
        <View key={i} style={[styles.link, { left: prop.x - 9 + Math.sin(time * 2 + i * 0.6) * 3, top: prop.y - i * 22 - 20, transform: [{ rotate: i % 2 ? '90deg' : '0deg' }] }]} />
      ))}
      <View style={[styles.anchorBlock, { left: prop.x - 20, top: prop.y - 6 }]} />
      {prop.progress > 0 && prop.progress < 1 && (
        <View style={[styles.timerBar, { left: prop.x - 30, top: prop.y - links * 22 - 34 }]}>
          <View style={[styles.timerFill, { width: 60 * clamp(prop.progress, 0, 1) }]} />
        </View>
      )}
    </>
  );
}

export function TidePropView({ prop, time }: { prop: Prop; time: number }) {
  if (prop.taken) return null;
  const bob = Math.sin(prop.phase * 2.2) * 4;
  switch (prop.kind) {
    case 'gate':
      return <GateView prop={prop} time={time} />;
    case 'material':
      return <MaterialView prop={prop} time={time} />;
    case 'rift':
      return <RiftView prop={prop} time={time} />;
    case 'shard':
      return (
        <>
          <Sprite name="rift_guardian" x={prop.x - 70} y={prop.y - 60 + Math.sin(time * 0.9) * 10} width={84} opacity={0.22 + Math.sin(time * 1.7) * 0.08} rotate={Math.sin(time * 0.6) * 4} />
          <Sprite name="atlantean_shard" x={prop.x} y={prop.y + bob} width={46} rotate={Math.sin(prop.phase * 1.3) * 10} />
        </>
      );
    case 'vent':
      return <VentView prop={prop} time={time} />;
    case 'dig':
      return <Sprite name="sand_mound" x={prop.x} y={prop.y + 8} width={80} anchor="bottom" opacity={prop.active ? 1 : 0.22} />;
    case 'chain':
      return <ChainView prop={prop} time={time} />;
    case 'heartstone':
      return (
        <>
          <Sprite name="rift_guardian" x={prop.x} y={prop.y - 120 + Math.sin(time * 0.8) * 12} width={120} opacity={0.3 + Math.sin(time * 1.4) * 0.1} />
          <Sprite name="heartstone" x={prop.x} y={prop.y + bob} width={74} scaleX={1 + Math.sin(time * 2) * 0.04} scaleY={1 + Math.sin(time * 2) * 0.04} />
        </>
      );
    case 'bottle':
      return <Sprite name="bottle_map" x={prop.x} y={prop.y + Math.sin(time * 2) * 3 - 8} width={42} rotate={60 + Math.sin(time * 1.5) * 12} />;
    case 'scan': {
      const ring = 34 + ((prop.phase * 36) % 44);
      return (
        <>
          {!prop.active && <View style={[styles.scanRing, { left: prop.x - ring, top: prop.y - ring, width: ring * 2, height: ring * 2, borderRadius: ring, opacity: 1 - (ring - 34) / 44 }]} />}
          <Sprite name="icon_pip" x={prop.x} y={prop.y + bob} width={34} opacity={prop.active ? 0.4 : 0.9} />
        </>
      );
    }
    default:
      return null;
  }
}

const TIDE_GLOW: Partial<Record<Prop['kind'], string>> = { shard: '#20D4E8', heartstone: '#FFBF32', rift: '#AD65F5', scan: '#20D4E8', dig: '#FFBF32' };

export function TidePropGlow({ prop, time }: { prop: Prop; time: number }) {
  const color = TIDE_GLOW[prop.kind];
  if (!color || prop.taken || (prop.kind === 'scan' && prop.active) || (prop.kind === 'dig' && !prop.active)) return null;
  const size = (prop.kind === 'rift' ? 120 : 46) + Math.sin(time * 3 + prop.phase) * 6;
  return <SoftGlow x={prop.x} y={prop.y} r={size} color={color} opacity={prop.kind === 'rift' ? 0.45 : 0.7} />;
}

const MOOD_COLORS: Record<string, string> = { '!': COLORS.coral, '?': COLORS.sky, '♥': COLORS.coral };

export function DroneView({ drone, time }: { drone: Drone; time: number }) {
  const off = drone.mode === 'off';
  const scouting = drone.mode === 'scout';
  const tilt = off ? 35 + Math.sin(time * 9) * 6 : clamp(drone.vx * 0.04, -14, 14);
  const bob = off ? 0 : Math.sin(drone.phase * 5) * 3;
  return (
    <>
      {scouting && <View style={[styles.scout, { left: drone.x - SCOUT_RADIUS, top: drone.y - SCOUT_RADIUS, width: SCOUT_RADIUS * 2, height: SCOUT_RADIUS * 2, borderRadius: SCOUT_RADIUS, opacity: 0.45 + Math.sin(time * 6) * 0.15 }]} />}
      {drone.carry && <Sprite name={drone.carry.kind === 'coins' ? 'coin' : drone.carry.kind === 'shard' ? 'atlantean_shard' : (MATERIALS[drone.carry.material as MaterialId]?.sprite ?? 'mat_scrap')} x={drone.x} y={drone.y + 22 + bob} width={22} />}
      <Sprite name="pip" x={drone.x} y={drone.y + bob} width={42} flip={drone.facing < 0} rotate={tilt * drone.facing} opacity={off ? 0.7 : 1} />
      {!off && <View style={[styles.prop, { left: drone.x - drone.facing * 14 - 8, top: drone.y + bob - 20, transform: [{ scaleX: Math.abs(Math.sin(time * 40)) }] }]} />}
      {drone.moodTime > 0 && drone.mood !== '' && (
        <View style={[styles.mood, { left: drone.x - 12, top: drone.y - 46 - (1.4 - drone.moodTime) * 8, opacity: Math.min(1, drone.moodTime * 2), borderColor: MOOD_COLORS[drone.mood] ?? COLORS.sky }]}>
          <Text style={[styles.moodText, { color: MOOD_COLORS[drone.mood] ?? COLORS.sky }]}>{drone.mood}</Text>
        </View>
      )}
    </>
  );
}

export function DroneLight({ drone, time }: { drone: Drone; time: number }) {
  if (drone.mode === 'off') return null;
  const scouting = drone.mode === 'scout' || drone.mode === 'out';
  const size = scouting ? SCOUT_RADIUS * 1.2 : 50;
  return <SoftGlow x={drone.x} y={drone.y} r={size} color="#BDF4FF" opacity={(scouting ? 0.55 : 0.35) + Math.sin(time * 4) * 0.05} />;
}

export function RockView({ rock, time }: { rock: FallingRock; time: number }) {
  if (rock.warn > 0) {
    const k = 1 - rock.warn / 0.6;
    return (
      <>
        <View style={[styles.rockShadow, { left: rock.x - rock.size / 2, top: rock.floor - 4, width: rock.size, opacity: 0.3 + k * 0.45 }]} />
        <Sprite name="rock_small" x={rock.x + Math.sin(time * 60) * 2} y={rock.y - 4} width={rock.size * 0.9} opacity={0.5 + k * 0.5} />
      </>
    );
  }
  return <Sprite name="rock_small" x={rock.x} y={rock.y} width={rock.size} rotate={(time * 200 + rock.id * 40) % 360} />;
}

export function MarkerView({ marker, time }: { marker: Marker; time: number }) {
  if (marker.kind === 'flare') return <Sprite name="icon_flare" x={marker.x} y={marker.y} width={26} rotate={-30 + Math.sin(time * 9) * 4} />;
  if (marker.kind === 'bait') return <Sprite name="icon_bait" x={marker.x} y={marker.y + Math.sin(time * 2) * 3} width={32} />;
  return (
    <>
      <View style={[styles.beam, { left: marker.x - 3, top: marker.y - 900, height: 900, opacity: 0.18 + Math.sin(time * 2) * 0.06 }]} />
      <Sprite name="tide_buoy" x={marker.x} y={marker.y + Math.sin(time * 2) * 3} width={34} />
    </>
  );
}

export function MarkerGlow({ marker, time }: { marker: Marker; time: number }) {
  if (marker.kind !== 'flare') return null;
  const size = 300 * (0.92 + Math.sin(time * 13) * 0.04 + Math.sin(time * 7) * 0.04) * clamp(marker.time / 2, 0.3, 1);
  return <SoftGlow x={marker.x} y={marker.y} r={size} color="#FFB37A" opacity={0.42} />;
}

export function CraneView({ state }: { state: GameState }) {
  const { boat, time, stats } = state;
  if (!stats.crane || state.phase !== 'dive') return null;
  const x = boat.x - boat.shown * 70;
  const sway = Math.sin(time * 1.3) * 10;
  const heavy = state.diver.carried.some((c) => c.kind === 'heavy');
  return (
    <>
      <View style={[styles.cable, { left: x - 1, top: -40, height: HOOK_Y + 40, transform: [{ rotate: `${sway * 0.08}deg` }] }]} />
      {heavy && <View style={[styles.glow, { left: x + sway - 50, top: HOOK_Y - 40, width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.gold, opacity: 0.22 + Math.sin(time * 4) * 0.08 }]} />}
      <Sprite name="crane_hook" x={x + sway} y={HOOK_Y} width={40} rotate={-sway * 0.6} />
    </>
  );
}

export function BellView({ state }: { state: GameState }) {
  const spot = bellSpot(state);
  if (!spot || state.phase !== 'dive') return null;
  const { time } = state;
  const used = state.diver.bellUsed;
  return (
    <>
      <View style={[styles.cable, { left: spot.x - 1, top: 0, height: spot.y - 26 }]} />
      {!used && <SoftGlow x={spot.x} y={spot.y} r={80} color={COLORS.aqua} opacity={0.5 + Math.sin(time * 3) * 0.1} />}
      <Sprite name="mod_bell" x={spot.x} y={spot.y + Math.sin(time * 1.4) * 3} width={62} opacity={used ? 0.7 : 1} />
    </>
  );
}

export function BoatModulesView({ state, x, y, width, height, flip }: { state: GameState; x: number; y: number; width: number; height: number; flip: boolean }) {
  return (
    <>
      {state.boatDecor.map((d) => {
        const w = width * d.width;
        const h = spriteHeight(d.sprite as SpriteName, w);
        const cx = x + (flip ? -d.x : d.x) * width;
        const cy = y + d.y * height;
        return <Image key={d.slot} source={SPRITES[d.sprite as SpriteName].source} fadeDuration={0} style={{ position: 'absolute', left: cx - w / 2, top: cy - h, width: w, height: h, transform: [{ scaleX: flip ? -1 : 1 }] }} />;
      })}
    </>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  siphonLink: { position: 'absolute', height: 2, backgroundColor: 'rgba(230, 160, 255, 0.6)' },
  gateSlot: { position: 'absolute', backgroundColor: '#20D4E8' },
  gateWarn: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.coral },
  timerBar: { position: 'absolute', width: 60, height: 7, borderRadius: 4, backgroundColor: 'rgba(4, 27, 61, 0.8)', overflow: 'hidden' },
  timerFill: { height: 7, backgroundColor: COLORS.aqua },
  badge: { position: 'absolute', fontFamily: FONTS.title, fontSize: 13, color: COLORS.gold, ...textShadow },
  riftEdge: { position: 'absolute', borderWidth: 3, borderStyle: 'dashed', borderColor: 'rgba(200, 182, 255, 0.55)' },
  ventColumn: { position: 'absolute', width: 68, borderRadius: 34, backgroundColor: '#FFE9A8' },
  link: { position: 'absolute', width: 18, height: 26, borderRadius: 9, borderWidth: 5, borderColor: '#2E323B', backgroundColor: 'rgba(180, 186, 198, 0.25)' },
  anchorBlock: { position: 'absolute', width: 40, height: 18, borderRadius: 5, backgroundColor: '#4A4E58', borderWidth: 3, borderColor: '#1F2228' },
  scanRing: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.aqua },
  scout: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(189, 244, 255, 0.8)' },
  prop: { position: 'absolute', width: 16, height: 3, borderRadius: 2, backgroundColor: 'rgba(230, 251, 255, 0.85)' },
  mood: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  moodText: { fontFamily: FONTS.title, fontSize: 14, lineHeight: 18 },
  rockShadow: { position: 'absolute', height: 8, borderRadius: 4, backgroundColor: '#1B1206' },
  beam: { position: 'absolute', width: 6, borderRadius: 3, backgroundColor: COLORS.aqua },
  cable: { position: 'absolute', width: 2, backgroundColor: 'rgba(30, 40, 60, 0.85)', transformOrigin: 'top' },
});
