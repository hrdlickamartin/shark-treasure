import { StyleSheet, View } from 'react-native';
import { CHUNK_W, PX_PER_M, SONAR_DURATION } from '../game/constants';
import type { GameState, View as ViewSize } from '../game/types';
import { Background } from './Background';
import { Darkness } from './Darkness';
import {
  BoatView,
  ChestView,
  CoinView,
  DiverView,
  FishView,
  FloatTextView,
  HazardView,
  ParticleView,
  SharkView,
  SonarRing,
  WavesView,
} from './Entities';
import { FrontDecor, SeabedChunk, useSwayClocks } from './SeabedChunk';

interface Props {
  state: GameState;
  view: ViewSize;
}

export function World({ state, view }: Props) {
  useSwayClocks();
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
  const sonarActive = state.sonarTime > 0;
  const sonarProgress = sonarActive ? ((SONAR_DURATION - state.sonarTime) % 1.3) / 1.3 : 0;
  const inSonar = (x: number, y: number) => sonarActive && Math.hypot(x - diver.x, y - diver.y) < state.stats.sonarRange;
  const lowOxygen =
    state.phase === 'dive' && diver.state === 'diving' && diver.oxygen / state.stats.oxygenMax < 0.25
      ? 0.6 + Math.sin(time * 6) * 0.4
      : 0;
  const diverOnBoat = diver.state === 'boat' || diver.state === 'climbing';

  return (
    <View style={styles.root} pointerEvents="none">
      <Background camX={camX} camY={camY} view={view} time={time} />
      <View
        style={[
          styles.world,
          { transform: [{ translateX: view.width / 2 - camX + shakeX }, { translateY: -camY + shakeY }] },
        ]}
      >
        {chunks.map((chunk) => (
          <SeabedChunk key={chunk.index} chunk={chunk} />
        ))}
        {state.hazards.map((h) => (h.alive && visible(h.x, h.y) ? <HazardView key={h.id} hazard={h} time={time} /> : null))}
        {state.chests.map((c) => (visible(c.x, c.y) ? <ChestView key={c.id} chest={c} time={time} highlight={inSonar(c.x, c.y)} /> : null))}
        {state.coins.map((c) => (visible(c.x, c.y) ? <CoinView key={c.id} coin={c} /> : null))}
        {state.fish.map((f) => (visible(f.x, f.y) ? <FishView key={f.id} school={f} /> : null))}
        {state.sharks.map((s) => (visible(s.x, s.y) ? <SharkView key={s.id} shark={s} /> : null))}
        {diverOnBoat && <DiverView state={state} />}
        <BoatView state={state} />
        {!diverOnBoat && <DiverView state={state} />}
        <WavesView left={minX} width={maxX - minX} time={time} />
        {chunks.map((chunk) => (
          <FrontDecor key={chunk.index} chunk={chunk} />
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
        lightX={view.width / 2 + (diver.x - camX)}
        lightY={diver.y - camY}
        light={state.stats.light}
        lowOxygen={lowOxygen}
      />
    </View>
  );
}

export const depthMeters = (state: GameState) => Math.max(0, Math.round(state.diver.y / PX_PER_M));

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#0A5FB0' },
  world: { position: 'absolute', left: 0, top: 0, width: 1, height: 1 },
});
