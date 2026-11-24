import { Image, StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../ui/theme';
import { CHUNK_W, PX_PER_M, SONAR_DURATION } from '../game/constants';
import type { GameState, View as ViewSize } from '../game/types';
import { Background } from './Background';
import { Darkness } from './Darkness';
import {
  BalloonView,
  BoatView,
  BossHealth,
  ChestView,
  CoinView,
  CrabView,
  PropGlow,
  PropView,
  LureGlow,
  DiverView,
  FishView,
  FloatTextView,
  HarpoonReticle,
  HarpoonShotView,
  HazardView,
  ParticleView,
  SharkView,
  SonarRing,
  SubmarineView,
} from './Entities';
import { SHAFT_SEG } from '../game/endless';
import { ShaftSegment, AirView } from './Shaft';
import { SURFACE_TILE, useClocks } from './clocks';
import { CaveRock, FrontDecor, SeabedChunk, SurfaceWaves } from './SeabedChunk';
import { caveAt } from '../game/world';
import { oceanOf } from '../game/oceans';

interface Props {
  state: GameState;
  view: ViewSize;
}

export function World({ state, view }: Props) {
  useClocks();
  const { camera, diver, time } = state;
  const shakeX = camera.offsetX;
  const shakeY = camera.offsetY;
  const camX = camera.x;
  const camY = camera.y;
  const half = view.width / 2 + 220;
  const minX = camX - half;
  const maxX = camX + half;
  const minY = camY - 200;
  const maxY = camY + view.height + 200;
  const visible = (x: number, y: number) => x > minX && x < maxX && y > minY && y < maxY;

  const chunks = [...state.chunks.values()].filter((c) => c.x0 + CHUNK_W > minX - 200 && c.x0 < maxX + 200);
  const shaftRows: number[] = [];
  if (state.mode === 'endless') {
    for (let i = Math.max(0, Math.floor(minY / SHAFT_SEG)); i <= Math.floor(maxY / SHAFT_SEG); i++) shaftRows.push(i);
  }
  const sonarActive = state.sonarTime > 0;
  const sonarProgress = sonarActive ? ((SONAR_DURATION - state.sonarTime) % 1.3) / 1.3 : 0;
  const inSonar = (x: number, y: number) => sonarActive && Math.hypot(x - diver.x, y - diver.y) < state.stats.sonarRange;
  const lowOxygen =
    state.phase === 'dive' && diver.state === 'diving' && diver.oxygen / state.stats.oxygenMax < 0.25
      ? 0.6 + Math.sin(time * 6) * 0.4
      : 0;
  const diverOnBoat = diver.state === 'boat' || diver.state === 'climbing';
  const ocean = oceanOf(state);
  const diverScreenX = view.width / 2 + (diver.x - camX);
  const diverScreenY = diver.y - camY;
  const caveHere = diver.state === 'diving' ? caveAt(state, diver.x) : null;
  const inCave = !!caveHere && diver.y > caveHere.bottom && !diver.inAir;

  return (
    <View style={styles.root} pointerEvents="none">
      <Background camX={camX} camY={camY} view={view} time={time} condition={state.condition} layers={ocean.backgrounds} />
      <View
        style={[
          styles.world,
          { transform: [{ translateX: view.width / 2 - camX + shakeX }, { translateY: -camY + shakeY }] },
        ]}
      >
        {chunks.map((chunk) => (
          <SeabedChunk key={chunk.index} chunk={chunk} />
        ))}
        {chunks.map((chunk) => (chunk.cave ? <CaveRock key={`cave${chunk.index}`} chunk={chunk} /> : null))}
        {shaftRows.map((index) => (
          <ShaftSegment key={`shaft${index}`} seed={state.seed} index={index} />
        ))}
        {state.airs.map((a) => (visible(a.x, a.y) ? <AirView key={a.id} x={a.x} y={a.y} /> : null))}
        {state.hazards.map((h) => (h.alive && h.kind !== 'crab' && visible(h.x, h.y) ? <HazardView key={h.id} hazard={h} time={time} /> : null))}
        {state.chests.map((c) => (visible(c.x, c.y) ? <ChestView key={c.id} chest={c} time={time} highlight={inSonar(c.x, c.y) || state.condition === 'night'} /> : null))}
        {state.coins.map((c) => (visible(c.x, c.y) ? <CoinView key={c.id} x={c.x} y={c.y} /> : null))}
        {state.props.map((p) => (visible(p.x, p.y) ? <PropView key={p.id} prop={p} time={time} /> : null))}
        {state.fish.map((f) => (visible(f.x, f.y) ? <FishView key={f.id} school={f} /> : null))}
        {state.sharks.map((s) => (visible(s.x, s.y) ? <SharkView key={s.id} shark={s} /> : null))}
        {state.balloons.map((b) => (visible(b.x, b.y) ? <BalloonView key={b.id} balloon={b} time={time} /> : null))}
        {diverOnBoat && <DiverView state={state} />}
        {state.sub && state.phase === 'dive' && <SubmarineView x={state.sub.x} y={state.sub.y} time={time} active={diver.atSub} />}
        <BoatView state={state} />
        {!diverOnBoat && <DiverView state={state} />}
        {minY < 40 && <SurfaceWaves start={Math.floor(minX / SURFACE_TILE) * SURFACE_TILE} count={Math.ceil((maxX - minX) / SURFACE_TILE) + 3} />}
        {chunks.map((chunk) => (
          <FrontDecor key={chunk.index} chunk={chunk} />
        ))}
        {state.hazards.map((h) => (h.alive && h.kind === 'crab' && visible(h.x, h.y) ? <CrabView key={h.id} hazard={h} time={time} /> : null))}
        {state.harpoonShots.map((h) => (
          <HarpoonShotView key={h.id} shot={h} />
        ))}
        {sonarActive && <SonarRing x={diver.x} y={diver.y} progress={sonarProgress} range={state.stats.sonarRange} />}
        {state.particles.map((p, i) => (visible(p.x, p.y) ? <ParticleView key={i} p={p} /> : null))}
        {state.texts.map((t) => (
          <FloatTextView key={t.id} t={t} />
        ))}
      </View>
      <Darkness
        width={view.width}
        height={view.height}
        depthPx={Math.max(0, camY + view.height * 0.46)}
        extra={(state.condition === 'night' ? 0.5 : 0) + (inCave ? 0.45 : 0) + (state.mode === 'sea' ? (ocean.darkness ?? 0) : 0)}
        fog={state.mode === 'sea' ? (ocean.fog ?? 0) : 0}
        lightX={view.width / 2 + (diver.x - camX)}
        lightY={diver.y - camY}
        light={state.stats.light}
        lowOxygen={lowOxygen}
      />
      <View style={[styles.world, { transform: [{ translateX: view.width / 2 - camX + shakeX }, { translateY: -camY + shakeY }] }]} pointerEvents="none">
        {state.hazards.map((h) => (h.alive && h.kind === 'angler' && visible(h.x, h.y) ? <LureGlow key={h.id} hazard={h} time={time} /> : null))}
        {state.props.map((p) => (visible(p.x, p.y) ? <PropGlow key={p.id} prop={p} time={time} /> : null))}
        {state.sharks.map((s) => (s.maxHp > 1 && s.dying === 0 && visible(s.x, s.y) ? <BossHealth key={s.id} shark={s} /> : null))}
        {state.harpoonAim && !state.photoAim && <HarpoonReticle target={state.harpoonAim} time={time} />}
        {state.photoAim && <Viewfinder x={state.photoAim.x} y={state.photoAim.y} stars={state.photoAim.stars} ready={state.photoCooldown <= 0} />}
      </View>
      {state.inkTime > 0 &&
        INK_BLOBS.map((b, i) => (
          <Image
            key={i}
            source={INK}
            fadeDuration={0}
            style={{
              position: 'absolute',
              left: diverScreenX + b.x - b.r,
              top: diverScreenY + b.y - b.r,
              width: b.r * 2,
              height: b.r * 2,
              opacity: Math.min(1, state.inkTime / 0.6) * 0.92,
              transform: [{ rotate: `${i * 67}deg` }, { scale: 1 + (1.4 - state.inkTime) * 0.15 }],
            }}
          />
        ))}
    </View>
  );
}

const INK = require('../../assets/fx/ink.png');

const INK_BLOBS = [
  { x: -30, y: -18, r: 70 },
  { x: 38, y: 8, r: 78 },
  { x: -6, y: 34, r: 60 },
]

export const depthMeters = (state: GameState) => Math.max(0, Math.round(state.diver.y / PX_PER_M));

const AIM = 64;
const AIM_COLORS = ['#FFFFFF', '#FFFFFF', '#59E0F0', '#FFBF32'];

function Viewfinder({ x, y, stars, ready }: { x: number; y: number; stars: number; ready: boolean }) {
  const color = AIM_COLORS[stars];
  return (
    <View style={[styles.aim, { left: x - AIM / 2, top: y - AIM / 2, opacity: ready ? 0.95 : 0.4 }]}>
      <View style={[styles.corner, { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3, borderColor: color }]} />
      <View style={[styles.corner, { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3, borderColor: color }]} />
      <View style={[styles.corner, { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: color }]} />
      <View style={[styles.corner, { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3, borderColor: color }]} />
      <Text style={[styles.aimText, { color }]}>{stars}/3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aim: { position: 'absolute', width: AIM, height: AIM },
  corner: { position: 'absolute', width: 16, height: 16 },
  aimText: { position: 'absolute', bottom: -20, width: AIM, textAlign: 'center', fontFamily: FONTS.title, fontSize: 13, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#0A5FB0' },
  world: { position: 'absolute', left: 0, top: 0, width: 1, height: 1 },
});
