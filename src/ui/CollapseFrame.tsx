import { StyleSheet, View } from 'react-native';
import { COLLAPSE_TIME } from '../game/systems/collapse';

const CRACKS = [
  { left: '6%', top: 0, length: 70, angle: 24 },
  { left: '38%', top: 0, length: 54, angle: -18 },
  { left: '71%', top: 0, length: 80, angle: 32 },
  { right: 0, top: '30%', length: 64, angle: 112 },
  { right: 0, top: '68%', length: 58, angle: 70 },
  { left: '22%', bottom: 0, length: 66, angle: -30 },
  { left: '58%', bottom: 0, length: 52, angle: 20 },
  { left: 0, top: '44%', length: 72, angle: -62 },
] as const;

export function CollapseFrame({ time, reduceMotion }: { time: number; reduceMotion: boolean }) {
  const danger = 1 - Math.max(0, time) / COLLAPSE_TIME;
  const visible = Math.ceil(danger * CRACKS.length);
  const flicker = reduceMotion ? 1 : 0.75 + Math.abs(Math.sin(time * (4 + danger * 8))) * 0.25;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.frame, { borderWidth: 6 + danger * 12, opacity: (0.35 + danger * 0.5) * flicker }]}>
      {CRACKS.slice(0, visible).map(({ length, angle, ...position }, i) => (
        <View key={i} style={[styles.crack, { ...position, width: length * (0.6 + danger * 0.6), transform: [{ rotate: `${angle}deg` }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderColor: '#6B4A2A' },
  crack: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: '#2A1A0C' },
});
