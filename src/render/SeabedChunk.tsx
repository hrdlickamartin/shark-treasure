import { memo, useEffect } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { CHUNK_W } from '../game/constants';
import { REGIONS } from '../game/regions';
import { hash, mulberry32 } from '../game/rng';
import type { Chunk, DecorItem } from '../game/types';
import { PROFILE_STEP } from '../game/world';
import { spriteHeight } from './Sprite';
import { SPRITES } from './spriteAssets';

const DEPTH_BELOW = 700;

const swayClocks = [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)];
const swayDurations = [3200, 4100, 5000];
let swayStarted = false;

export function useSwayClocks() {
  useEffect(() => {
    if (swayStarted) return;
    swayStarted = true;
    swayClocks.forEach((clock, i) => {
      Animated.loop(
        Animated.timing(clock, { toValue: 1, duration: swayDurations[i], easing: Easing.linear, useNativeDriver: true }),
      ).start();
    });
  }, []);
}

const swayRotations = swayClocks.map((clock, i) =>
  [3, 6].map((deg) =>
    clock.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [`${i % 2 ? deg : -deg}deg`, '0deg', `${i % 2 ? -deg : deg}deg`, '0deg', `${i % 2 ? deg : -deg}deg`],
    }),
  ),
);

function DecorSprite({ item }: { item: DecorItem }) {
  const height = spriteHeight(item.sprite, item.width);
  const base = {
    position: 'absolute' as const,
    opacity: item.front ? 0.6 : 1,
    left: item.x - item.width / 2,
    top: item.y - height,
    width: item.width,
    height,
  };
  if (item.sway <= 0) {
    return <Image source={SPRITES[item.sprite].source} fadeDuration={0} style={[base, { transform: [{ scaleX: item.flip ? -1 : 1 }] }]} />;
  }
  const clock = Math.abs(Math.round(item.x)) % 3;
  const rotate = swayRotations[clock][item.sway >= 1 ? 1 : 0];
  return (
    <Animated.Image
      source={SPRITES[item.sprite].source}
      fadeDuration={0}
      style={[base, { transformOrigin: 'bottom', transform: [{ rotate }, { scaleX: item.flip ? -1 : 1 }] }]}
    />
  );
}

export const SeabedChunk = memo(function SeabedChunk({ chunk }: { chunk: Chunk }) {
  const region = REGIONS[chunk.regionId];
  const height = Math.max(...chunk.profile) - chunk.top + DEPTH_BELOW;
  const points = chunk.profile.map((y, i) => `${i * PROFILE_STEP},${(y - chunk.top).toFixed(1)}`);
  const fill = `M0,${height} L${points.join(' L')} L${CHUNK_W + 2},${(chunk.profile[chunk.profile.length - 1] - chunk.top).toFixed(1)} L${CHUNK_W + 2},${height} Z`;
  const edge = `M${points.join(' L')} L${CHUNK_W + 2},${(chunk.profile[chunk.profile.length - 1] - chunk.top).toFixed(1)}`;
  const r = mulberry32(hash(chunk.index, 31));
  const pebbles = Array.from({ length: 9 }, (_, i) => {
    const px = r() * CHUNK_W;
    const idx = Math.min(chunk.profile.length - 1, Math.round(px / PROFILE_STEP));
    return { key: i, x: px, y: chunk.profile[idx] - chunk.top + 14 + r() * 50, rx: 3 + r() * 7, ry: 2 + r() * 3 };
  });
  const glows = chunk.regionId >= 4
    ? Array.from({ length: 6 }, (_, i) => {
        const px = r() * CHUNK_W;
        const idx = Math.min(chunk.profile.length - 1, Math.round(px / PROFILE_STEP));
        return { key: i, x: px, y: chunk.profile[idx] - chunk.top + 6 + r() * 30, r: 2 + r() * 3 };
      })
    : [];
  const back = chunk.decor.filter((d) => !d.front);
  return (
    <>
      <Svg style={[styles.svg, { left: chunk.x0 - 1, top: chunk.top, width: CHUNK_W + 3, height }]} width={CHUNK_W + 3} height={height}>
        <Defs>
          <LinearGradient id={`sand${chunk.index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={region.sand} />
            <Stop offset="0.12" stopColor={region.sandDark} />
            <Stop offset="1" stopColor={region.sandEdge} />
          </LinearGradient>
        </Defs>
        <Path d={fill} fill={`url(#sand${chunk.index})`} />
        <Path d={edge} stroke={region.sandEdge} strokeWidth={4} fill="none" strokeLinejoin="round" />
        {pebbles.map((p) => (
          <Ellipse key={p.key} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={region.sandEdge} opacity={0.45} />
        ))}
        {glows.map((g) => (
          <Circle key={g.key} cx={g.x} cy={g.y} r={g.r} fill="#20D4E8" opacity={0.8} />
        ))}
      </Svg>
      {back.map((item) => (
        <DecorSprite key={item.key} item={item} />
      ))}
    </>
  );
});

export const FrontDecor = memo(function FrontDecor({ chunk }: { chunk: Chunk }) {
  return (
    <>
      {chunk.decor
        .filter((d) => d.front)
        .map((item) => (
          <DecorSprite key={item.key} item={item} />
        ))}
    </>
  );
});

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
});
