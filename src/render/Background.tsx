import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { PX_PER_M } from '../game/constants';
import { clamp } from '../game/rng';
import type { View as ViewSize } from '../game/types';
import { Sprite } from './Sprite';
import { BACKGROUNDS } from './spriteAssets';

const BG_ASPECT = 1.5;
const DEPTH_STOPS = [0, 25, 60, 110];
const BLEND_M = 14;
const PLANKTON = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 7919) % 997 / 997,
  y: (i * 104729) % 991 / 991,
  s: 1.5 + ((i * 31) % 5) * 0.6,
}));

function layerOpacities(depthM: number): number[] {
  const values = DEPTH_STOPS.map((stop, i) => (i === 0 ? 1 : clamp((depthM - stop + BLEND_M) / BLEND_M, 0, 1)));
  let lastFull = 0;
  values.forEach((v, i) => {
    if (v >= 1) lastFull = i;
  });
  return values.map((v, i) => (i < lastFull ? 0 : v));
}

const Sky = memo(function Sky({ width, height }: { width: number; height: number }) {
  const horizon = height * 0.46;
  return (
    <Svg width={width} height={horizon}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3FA9F5" />
          <Stop offset="0.7" stopColor="#8FD8FF" />
          <Stop offset="1" stopColor="#CDEFFF" />
        </LinearGradient>
        <RadialGradient id="sun" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF8D6" stopOpacity="1" />
          <Stop offset="0.45" stopColor="#FFE58A" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#FFE58A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={horizon} fill="url(#sky)" />
      <Circle cx={width * 0.82} cy={horizon * 0.3} r={Math.min(70, horizon * 0.45)} fill="url(#sun)" />
    </Svg>
  );
});

interface Props {
  camX: number;
  camY: number;
  view: ViewSize;
  time: number;
}

export function Background({ camX, camY, view, time }: Props) {
  const { width: W, height: H } = view;
  const surfaceY = -camY;
  const depthM = Math.max(0, (camY + H * 0.46) / PX_PER_M);
  const height = H * 1.3;
  const tileW = height * BG_ASPECT;
  const top = Math.max(H - height, surfaceY > 0 ? surfaceY : surfaceY * 0.12);
  const scroll = camX * 0.22;
  const firstTile = Math.floor(scroll / tileW);
  const offset = -(scroll - firstTile * tileW);
  const tiles = Math.ceil(W / tileW) + 2;
  const opacities = layerOpacities(depthM);
  const skyH = Math.max(0, surfaceY);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: depthM > 80 ? '#06214A' : '#0A5FB0' }]} />
      {opacities.map((opacity, layer) =>
        opacity > 0.01 ? (
          <View key={layer} style={[StyleSheet.absoluteFill, { opacity }]}>
            {Array.from({ length: tiles }, (_, k) => {
              const index = firstTile + k;
              return (
                <Image
                  key={index}
                  source={BACKGROUNDS[layer]}
                  fadeDuration={0}
                  style={{
                    position: 'absolute',
                    left: offset + k * tileW - 1,
                    top,
                    width: tileW + 2,
                    height,
                    transform: [{ scaleX: index % 2 === 0 ? 1 : -1 }],
                  }}
                />
              );
            })}
          </View>
        ) : null,
      )}
      {surfaceY < H &&
        PLANKTON.map((p, i) => {
          const px = (((p.x * W - camX * 0.5) % W) + W) % W;
          const py = (((p.y * H - camY * 0.5 + Math.sin(time * 0.5 + i) * 6) % H) + H) % H;
          if (py < surfaceY + 6) return null;
          return <View key={i} style={[styles.plankton, { left: px, top: py, width: p.s, height: p.s, borderRadius: p.s }]} />;
        })}
      {skyH > 0 && (
        <View style={[styles.sky, { height: skyH }]}>
          <Sky width={W} height={H} />
          {[0, 1, 2].map((i) => {
            const span = W + 300;
            const cx = ((((i * 0.37 + 0.1) * span - camX * 0.05 + time * (6 + i * 3)) % span) + span) % span - 150;
            return <Sprite key={i} name="cloud" x={cx} y={skyH * (0.22 + i * 0.16)} width={90 + i * 26} opacity={0.95} />;
          })}
          <Sprite name="island" x={((((W * 0.25 - camX * 0.08) % (W * 2)) + W * 2) % (W * 2)) - W * 0.25} y={skyH + 4} width={150} anchor="bottom" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  plankton: { position: 'absolute', backgroundColor: 'rgba(220, 245, 255, 0.55)' },
});
