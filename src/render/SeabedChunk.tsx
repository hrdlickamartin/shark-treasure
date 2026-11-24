import { memo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { CHUNK_W } from '../game/constants';
import { hash, mulberry32 } from '../game/rng';
import type { Chunk, DecorItem } from '../game/types';
import { PROFILE_STEP } from '../game/world';
import { glowClock, surfaceClocks, SURFACE_TILE, swayClocks, waveClock, wobble } from './clocks';
import { spriteHeight } from './Sprite';
import { SPRITES, type SpriteName } from './spriteAssets';

const DEPTH_BELOW = 700;
const SAND_GRADIENT_END = 1800;
const SAND_BAND = 18;

const surfaceRows = [
  {
    source: require('../../assets/fx/wave_back.png'),
    top: -20,
    shift: surfaceClocks[0].interpolate({ inputRange: [0, 1], outputRange: [0, SURFACE_TILE] }),
    bob: wobble(swayClocks[0], 2),
  },
  {
    source: require('../../assets/fx/wave_front.png'),
    top: -14,
    shift: surfaceClocks[1].interpolate({ inputRange: [0, 1], outputRange: [0, -SURFACE_TILE] }),
    bob: wobble(swayClocks[1], -2),
  },
];

export const SurfaceWaves = memo(function SurfaceWaves({ start, count }: { start: number; count: number }) {
  return (
    <>
      {surfaceRows.map((row, r) => (
        <Animated.View key={r} style={[styles.surfaceRow, { top: row.top, left: start, transform: [{ translateX: row.shift }, { translateY: row.bob }] }]}>
          {Array.from({ length: count }, (_, i) => (
            <Image key={i} source={row.source} fadeDuration={0} style={[styles.surfaceTile, { left: (i - 1) * SURFACE_TILE }]} />
          ))}
        </Animated.View>
      ))}
    </>
  );
});

const glowPulse = glowClock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.7, 0.25] });

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
  const region = chunk.palette;
  const height = Math.max(...chunk.profile) - chunk.top + DEPTH_BELOW;
  const points = chunk.profile.map((y, i) => `${i * PROFILE_STEP},${(y - chunk.top).toFixed(1)}`);
  const fill = `M0,${height} L${points.join(' L')} L${CHUNK_W + 2},${(chunk.profile[chunk.profile.length - 1] - chunk.top).toFixed(1)} L${CHUNK_W + 2},${height} Z`;
  const edge = `M${points.join(' L')} L${CHUNK_W + 2},${(chunk.profile[chunk.profile.length - 1] - chunk.top).toFixed(1)}`;
  const band = `M${chunk.profile.map((y, i) => `${i * PROFILE_STEP},${(y - chunk.top + SAND_BAND / 2).toFixed(1)}`).join(' L')} L${CHUNK_W + 2},${(chunk.profile[chunk.profile.length - 1] - chunk.top + SAND_BAND / 2).toFixed(1)}`;
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
          <LinearGradient id={`sand${chunk.index}`} gradientUnits="userSpaceOnUse" x1="0" y1={-chunk.top} x2="0" y2={SAND_GRADIENT_END - chunk.top}>
            <Stop offset="0" stopColor={region.sandDark} />
            <Stop offset="1" stopColor={region.sandEdge} />
          </LinearGradient>
        </Defs>
        <Path d={fill} fill={`url(#sand${chunk.index})`} />
        <Path d={band} stroke={region.sand} strokeWidth={SAND_BAND} fill="none" strokeLinejoin="round" />
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
  surfaceRow: { position: 'absolute', width: 1, height: 48 },
  surfaceTile: { position: 'absolute', top: 0, width: SURFACE_TILE + 1, height: 48 },
  crystalGlow: { position: 'absolute', backgroundColor: '#20D4E8' },
  bubble: { position: 'absolute', borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.8)', backgroundColor: 'rgba(220, 245, 255, 0.25)' },
  sparkle: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
});

const WAVE = require('../../assets/fx/wave_front.png');
const WAVE_W = 150;

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (v: number, shift: number) => (v >> shift) & 255;
  const out = [16, 8, 0].map((shift) => Math.round(ch(pa, shift) + (ch(pb, shift) - ch(pa, shift)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface RockColors {
  top: string;
  mid: string;
  bottom: string;
  line: string;
  light: string;
}

const CAVE_SHADE = '#04162F';

type Point = [number, number];

function smoothPath(pts: Point[]): string {
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${f(x)},${f(y)} ${f((x + nx) / 2)},${f((y + ny) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${f(lx)},${f(ly)}`;
}

const POCKET_STEPS = 14;
const bubbleRise = [0, 1, 2].map((i) => glowClock.interpolate({ inputRange: [0, 1], outputRange: [0, -(26 + i * 8)] }));
const bubbleFade = glowClock.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 0.5, 0] });

function AirPocket({ x, y, r, seed, colors }: { x: number; y: number; r: number; seed: number; colors: RockColors }) {
  const rand = mulberry32(hash(seed, 977));
  const w = r * 2 + 24;
  const h = r + 18;
  const cx = w / 2;
  const base = r + 10;
  const level = base - r * 0.38;
  const dome = Array.from({ length: POCKET_STEPS + 1 }, (_, i) => {
    const a = Math.PI - (Math.PI * i) / POCKET_STEPS;
    const k = 1 + (rand() - 0.5) * 0.2;
    return `${(cx + Math.cos(a) * (r + 4) * k).toFixed(1)},${(base - Math.sin(a) * r * k).toFixed(1)}`;
  });
  const cavity = `M${cx - r - 10},${base + 6} L${dome.join(' L')} L${cx + r + 10},${base + 6} Z`;
  const shift = waveClock.interpolate({ inputRange: [0, 1], outputRange: [0, -WAVE_W] });
  const id = `pocket${seed}`;
  return (
    <View style={{ position: 'absolute', left: x - w / 2, top: y - base, width: w, height: h }} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mix(colors.mid, '#A9D8E6', 0.45)} />
            <Stop offset="0.45" stopColor={mix(colors.mid, '#CDEFF8', 0.7)} />
            <Stop offset={(level / h).toFixed(2)} stopColor="#EAF9FD" />
            <Stop offset={(level / h + 0.01).toFixed(2)} stopColor="#2E6F96" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#1C4F73" stopOpacity={0.4} />
          </LinearGradient>
        </Defs>
        <Path d={cavity} fill={`url(#${id}a)`} stroke={colors.line} strokeWidth={4} strokeLinejoin="round" />
        <Path d={`M${dome.slice(2, POCKET_STEPS - 1).join(' L')}`} stroke={colors.light} strokeWidth={2} opacity={0.25} fill="none" />
        <Ellipse cx={cx} cy={level - 2} rx={r * 0.9} ry={3} fill="#F4FCFF" opacity={0.85} />
        <Ellipse cx={cx - r * 0.3} cy={level - r * 0.28} rx={r * 0.32} ry={r * 0.12} fill="#FFFFFF" opacity={0.16} />
      </Svg>
      <View style={{ position: 'absolute', left: 12, top: level - 9, width: w - 24, height: 16, overflow: 'hidden' }}>
        <Animated.View style={{ flexDirection: 'row', opacity: 0.8, transform: [{ translateX: shift }] }}>
          {[0, 1, 2].map((i) => (
            <Image key={i} source={WAVE} fadeDuration={0} style={{ width: WAVE_W, height: 16 }} />
          ))}
        </Animated.View>
      </View>
      {bubbleRise.map((rise, i) => (
        <Animated.View key={i} style={[styles.bubble, { left: cx + (i - 1) * r * 0.45, top: base - 2, width: 5 + i * 2, height: 5 + i * 2, opacity: bubbleFade, transform: [{ translateY: rise }] }]} />
      ))}
      <Animated.View style={[styles.sparkle, { left: cx - r * 0.45, top: level - 5, opacity: glowPulse }]} />
      <Animated.View style={[styles.sparkle, { left: cx + r * 0.35, top: level - 4, opacity: glowPulse }]} />
    </View>
  );
}

function caveSample(arr: number[], x: number): number {
  const f = x / PROFILE_STEP;
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)));
  const k = Math.max(0, Math.min(1, f - i));
  return arr[i] + (arr[i + 1] - arr[i]) * k;
}

function AnimatedSprite({ name, left, top, width, rotate, origin, opacity }: { name: SpriteName; left: number; top: number; width: number; rotate?: Animated.AnimatedInterpolation<string>; origin?: string; opacity?: Animated.AnimatedInterpolation<number> }) {
  const height = spriteHeight(name, width);
  return (
    <Animated.Image
      source={SPRITES[name].source}
      fadeDuration={0}
      style={{ position: 'absolute', left, top, width, height, opacity: opacity ?? 1, transformOrigin: origin ?? 'center', transform: rotate ? [{ rotate }] : [] }}
    />
  );
}

export const CaveRock = memo(function CaveRock({ chunk }: { chunk: Chunk }) {
  const cave = chunk.cave;
  if (!cave) return null;
  const sand = chunk.palette;
  const solid = cave.top.map((t, i) => cave.bottom[i] - t > 8);
  const first = Math.max(0, solid.indexOf(true) - 1);
  const last = Math.min(cave.top.length - 1, Math.max(first, solid.lastIndexOf(true) + 1));
  const span = Array.from({ length: last - first + 1 }, (_, k) => first + k);
  const floorAt = (i: number) => chunk.profile[Math.min(chunk.profile.length - 1, i)];
  const svgTop = Math.min(...cave.top) - 12;
  const height = Math.max(...span.map(floorAt)) + 4 - svgTop;
  const px = (i: number) => i * PROFILE_STEP;
  const py = (y: number) => y - svgTop;
  const topPts = span.map((i): Point => [px(i), py(cave.top[i])]);
  const underPts = span.map((i): Point => [px(i), py(cave.bottom[i])]);
  const floorPts = span.map((i): Point => [px(i), py(floorAt(i))]);
  const slab = `${smoothPath([...topPts, ...[...underPts].reverse()])} Z`;
  const interior = `${smoothPath([...underPts, ...[...floorPts].reverse()])} Z`;
  const x0 = px(span[0]);
  const x1 = px(span[span.length - 1]);
  const id = `cave${chunk.index}`;
  const pocket = cave.pocket;
  const nearPocket = (x: number, pad: number) => !!pocket && Math.abs(cave.x0 + x - pocket.x) < pocket.r + pad;
  const r = mulberry32(hash(chunk.index, 811));
  const thick = (i: number) => cave.bottom[i] - cave.top[i];
  const pebbles = span
    .filter((i) => thick(i) > 46)
    .map((i) => ({ key: i, x: px(i) + (r() - 0.5) * 16, y: py(cave.top[i] + SAND_BAND + (thick(i) - SAND_BAND) * (0.3 + r() * 0.45)), rx: 3 + r() * 6, ry: 2 + r() * 3 }));
  const drips = span
    .filter((i) => thick(i) > 40 && !nearPocket(px(i), 34) && r() < 0.55)
    .map((i) => {
      const x = px(i) + (r() - 0.5) * 10;
      const base = py(caveSample(cave.bottom, x)) - 4;
      const len = 12 + r() * 20;
      const w = 6 + r() * 6;
      return { key: i, d: `M${x - w},${base} Q${x - w * 0.25},${base + len * 0.55} ${x},${base + len} Q${x + w * 0.25},${base + len * 0.55} ${x + w},${base} Z` };
    });
  const weeds = span
    .filter((i) => i % 3 === 1 && thick(i) > 50 && !nearPocket(px(i), 40) && r() < 0.5)
    .map((i) => ({ key: `w${i}`, x: cave.x0 + px(i) + 12, y: caveSample(cave.bottom, px(i) + 12) - 8, w: 34 + r() * 14 }));
  const plants = chunk.decor.filter((d) => !d.front && d.width < 110 && spriteHeight(d.sprite, d.width) < 140);
  const crown: DecorItem[] = plants.length
    ? span
        .filter((i) => i % 4 === 2 && thick(i) > 55)
        .slice(0, 3)
        .map((i, k) => {
          const model = plants[(((k + chunk.index) % plants.length) + plants.length) % plants.length];
          const x = cave.x0 + px(i) + (r() - 0.5) * 20;
          return { ...model, key: `p${i}`, x, y: caveSample(cave.top, x - cave.x0) + 6, width: model.width * 0.75, flip: r() < 0.5 };
        })
    : [];
  const crystals = [0.18, 0.82]
    .filter(() => r() < 0.75)
    .map((t, i) => {
      const x = cave.x0 + CHUNK_W * t + (r() - 0.5) * 40;
      return { key: `c${i}`, x, y: floorAt(Math.round((x - cave.x0) / PROFILE_STEP)) + 4, w: 34 + r() * 14 };
    });
  const colors: RockColors = { top: sand.sand, mid: sand.sandDark, bottom: sand.sandEdge, line: sand.sandEdge, light: sand.sand };
  return (
    <>
      <Svg style={[styles.svg, { left: cave.x0, top: svgTop, width: CHUNK_W + 2, height }]} width={CHUNK_W + 2} height={height}>
        <Defs>
          <LinearGradient id={`${id}s`} gradientUnits="userSpaceOnUse" x1="0" y1={-svgTop} x2="0" y2={SAND_GRADIENT_END - svgTop}>
            <Stop offset="0" stopColor={sand.sandDark} />
            <Stop offset="1" stopColor={sand.sandEdge} />
          </LinearGradient>
          <LinearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={CAVE_SHADE} stopOpacity={0.62} />
            <Stop offset="0.55" stopColor={CAVE_SHADE} stopOpacity={0.38} />
            <Stop offset="1" stopColor={CAVE_SHADE} stopOpacity={0.12} />
          </LinearGradient>
          <LinearGradient id={`${id}f`} gradientUnits="userSpaceOnUse" x1={x0} y1="0" x2={x1} y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.24" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="0.76" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <Mask id={`${id}m`}>
            <Rect x={0} y={0} width={CHUNK_W + 2} height={height} fill={`url(#${id}f)`} />
          </Mask>
          <ClipPath id={`${id}c`}>
            <Path d={slab} />
          </ClipPath>
        </Defs>
        <Path d={interior} fill={`url(#${id}d)`} mask={`url(#${id}m)`} />
        {drips.map((p) => (
          <Path key={p.key} d={p.d} fill={`url(#${id}s)`} stroke={sand.sandEdge} strokeWidth={2.5} strokeLinejoin="round" />
        ))}
        <Path d={slab} fill={`url(#${id}s)`} />
        <G clipPath={`url(#${id}c)`}>
          <Path d={smoothPath(topPts)} stroke={sand.sand} strokeWidth={SAND_BAND * 2} fill="none" strokeLinejoin="round" />
          <Path d={smoothPath(underPts)} stroke={CAVE_SHADE} strokeOpacity={0.3} strokeWidth={20} fill="none" strokeLinejoin="round" />
          {pebbles.map((p) => (
            <Ellipse key={p.key} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={sand.sandEdge} opacity={0.45} />
          ))}
        </G>
        <Path d={slab} fill="none" stroke={sand.sandEdge} strokeWidth={4} strokeLinejoin="round" />
      </Svg>
      {crown.map((item) => (
        <DecorSprite key={item.key} item={item} />
      ))}
      {crystals.map((c) => (
        <View key={c.key}>
          <Animated.View
            style={[
              styles.crystalGlow,
              { left: c.x - c.w, top: c.y - c.w * 1.6, width: c.w * 2, height: c.w * 2, borderRadius: c.w, opacity: glowPulse },
            ]}
          />
          <Image source={SPRITES.cave_crystal.source} fadeDuration={0} style={{ position: 'absolute', left: c.x - c.w / 2, top: c.y - spriteHeight('cave_crystal', c.w), width: c.w, height: spriteHeight('cave_crystal', c.w) }} />
        </View>
      ))}
      {weeds.map((h) => (
        <AnimatedSprite key={h.key} name="hanging_weed" left={h.x - h.w / 2} top={h.y} width={h.w} rotate={swayRotations[((Math.round(h.x) % 3) + 3) % 3][1]} origin="top" />
      ))}
      {pocket && <AirPocket x={pocket.x} y={pocket.y} r={pocket.r} seed={chunk.index} colors={colors} />}
    </>
  );
});
