import { memo } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { SHAFT_SEG, shaftWalls } from '../game/endless';
import { hash, mulberry32 } from '../game/rng';
import type { AirBubble } from '../game/types';
import { glowClock, wobble, swayClocks } from './clocks';
import { spriteHeight } from './Sprite';
import { SPRITES, type SpriteName } from './spriteAssets';

const STEP = 40;
const OUTER = 900;
const glowPulse = glowClock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.7, 0.25] });
const airBob = wobble(swayClocks[1], 6);

const TONES: [number, [number, number, number]][] = [
  [0, [0x46, 0x69, 0xa8]],
  [1500, [0x2f, 0x4f, 0x8c]],
  [3000, [0x2e, 0x30, 0x78]],
  [6000, [0x1a, 0x17, 0x48]],
];

function toneAt(y: number): string {
  const i = Math.max(0, TONES.findIndex(([at]) => at > y) - 1);
  const [a, ca] = TONES[i === -1 ? TONES.length - 1 : i];
  const next = TONES[Math.min(TONES.length - 1, i + 1)];
  const k = next[0] > a ? Math.min(1, Math.max(0, (y - a) / (next[0] - a))) : 0;
  const c = ca.map((v, j) => Math.round(v + (next[1][j] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const ShaftSegment = memo(function ShaftSegment({ seed, index }: { seed: number; index: number }) {
  const y0 = index * SHAFT_SEG;
  const rows: { y: number; left: number; right: number }[] = [];
  for (let y = 0; y <= SHAFT_SEG; y += STEP) rows.push({ y, ...shaftWalls(seed, y0 + y) });
  const minLeft = Math.min(...rows.map((r) => r.left));
  const maxRight = Math.max(...rows.map((r) => r.right));
  const x0 = minLeft - OUTER;
  const width = maxRight + OUTER - x0;
  const height = SHAFT_SEG + 2;
  const leftEdge = rows.map((r) => `${(r.left - x0).toFixed(1)},${r.y}`).join(' L');
  const rightEdge = rows.map((r) => `${(r.right - x0).toFixed(1)},${r.y}`).join(' L');
  const leftPath = `M0,0 L${leftEdge} L0,${height} Z`;
  const rightPath = `M${width},0 L${rightEdge} L${width},${height} Z`;
  const top = toneAt(y0);
  const bottom = toneAt(y0 + SHAFT_SEG);
  const r = mulberry32(hash(seed, index, 913));
  const spots = rows
    .filter((_, i) => i % 3 === 1)
    .flatMap((row) => [
      { key: `l${row.y}`, cx: row.left - x0 - 30 - r() * 120, cy: row.y + (r() - 0.5) * 20, rx: 8 + r() * 14, ry: 5 + r() * 8 },
      { key: `r${row.y}`, cx: row.right - x0 + 30 + r() * 120, cy: row.y + (r() - 0.5) * 20, rx: 8 + r() * 14, ry: 5 + r() * 8 },
    ]);
  const deep = y0 > 1000;
  const props: { key: string; name: SpriteName; x: number; y: number; w: number; side: number }[] = [];
  for (let i = 1; i < rows.length - 1; i += 3) {
    const row = rows[i];
    const side = r() < 0.5 ? -1 : 1;
    const name: SpriteName = deep && r() < 0.45 ? 'cave_crystal' : r() < 0.5 ? 'cave_rock_a' : 'cave_rock_b';
    const w = name === 'cave_crystal' ? 30 + r() * 12 : 70 + r() * 40;
    props.push({ key: `p${i}`, name, x: side < 0 ? row.left - w * 0.3 : row.right + w * 0.3, y: y0 + row.y, w, side });
  }

  return (
    <>
      <Svg style={[styles.svg, { left: x0, top: y0, width, height }]} width={width} height={height}>
        <Defs>
          <LinearGradient id={`shaft${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Path d={leftPath} fill={`url(#shaft${index})`} />
        <Path d={rightPath} fill={`url(#shaft${index})`} />
        {spots.map((s) => (
          <Ellipse key={s.key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="#14224A" opacity={0.45} />
        ))}
        <Path d={`M${leftEdge}`} fill="none" stroke="#0A1F45" strokeWidth={3} strokeLinejoin="round" />
        <Path d={`M${rightEdge}`} fill="none" stroke="#0A1F45" strokeWidth={3} strokeLinejoin="round" />
      </Svg>
      {props.map((p) => {
        const h = spriteHeight(p.name, p.w);
        const crystal = p.name === 'cave_crystal';
        return (
          <View key={p.key}>
            {crystal && (
              <Animated.View style={[styles.crystalGlow, { left: p.x - p.w, top: p.y - p.w, width: p.w * 2, height: p.w * 2, borderRadius: p.w, opacity: glowPulse }]} />
            )}
            <Image
              source={SPRITES[p.name].source}
              fadeDuration={0}
              style={{ position: 'absolute', left: p.x - p.w / 2, top: p.y - h / 2, width: p.w, height: h, transform: [{ rotate: `${p.side * 90}deg` }] }}
            />
          </View>
        );
      })}
    </>
  );
});

export const AirView = memo(function AirView({ x, y }: Pick<AirBubble, 'x' | 'y'>) {
  return (
    <Animated.View style={[styles.airWrap, { left: x - 29, top: y - 29, transform: [{ translateY: airBob }] }]}>
      <Animated.View style={[styles.airGlow, { opacity: glowPulse }]} />
      <View style={styles.air}>
        <View style={styles.airShine} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
  crystalGlow: { position: 'absolute', backgroundColor: '#20D4E8' },
  airWrap: { position: 'absolute', width: 58, height: 58 },
  air: { position: 'absolute', left: 7, top: 7, width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#E6FBFF', backgroundColor: 'rgba(142, 211, 234, 0.35)' },
  airGlow: { position: 'absolute', left: 0, top: 0, width: 58, height: 58, borderRadius: 29, backgroundColor: '#20D4E8' },
  airShine: { position: 'absolute', left: 8, top: 7, width: 12, height: 8, borderRadius: 6, backgroundColor: '#FFFFFF', opacity: 0.9 },
});
