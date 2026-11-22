import { Image, StyleSheet, View } from 'react-native';
import { PX_PER_M } from '../game/constants';
import { clamp } from '../game/rng';

const RADIAL = require('../../assets/fx/radial.png');
const VIGNETTE = require('../../assets/fx/vignette.png');
const NAVY = '#020D24';

interface Props {
  width: number;
  height: number;
  depthPx: number;
  lightX: number;
  lightY: number;
  light: number;
  lowOxygen: number;
}

export function Darkness({ width, height, depthPx, lightX, lightY, light, lowOxygen }: Props) {
  const dark = clamp((depthPx / PX_PER_M - 35) / 110, 0, 0.82);
  if (dark <= 0.01 && lowOxygen <= 0) return null;
  const radius = (light > 0 ? 120 + light * 75 : 150) * 2.4;
  const holeOpacity = light > 0 ? dark : dark * 0.45;
  const base = light > 0 ? 0 : dark * 0.55;
  const left = lightX - radius;
  const top = lightY - radius;
  const size = radius * 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dark > 0.01 && (
        <>
          {base > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: NAVY, opacity: base }]} />}
          <Image source={RADIAL} fadeDuration={0} style={{ position: 'absolute', left, top, width: size, height: size, opacity: holeOpacity }} />
          <View style={[styles.fill, { opacity: holeOpacity, left: 0, top: 0, right: 0, height: Math.max(0, top) }]} />
          <View style={[styles.fill, { opacity: holeOpacity, left: 0, top: top + size, right: 0, bottom: 0 }]} />
          <View style={[styles.fill, { opacity: holeOpacity, left: 0, top: Math.max(0, top), width: Math.max(0, left), height: Math.max(0, size + Math.min(0, top)) }]} />
          <View style={[styles.fill, { opacity: holeOpacity, left: left + size, top: Math.max(0, top), right: 0, height: Math.max(0, size + Math.min(0, top)) }]} />
        </>
      )}
      {lowOxygen > 0 && <Image source={VIGNETTE} fadeDuration={0} style={[StyleSheet.absoluteFill, { width, height, opacity: lowOxygen * 0.6 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', backgroundColor: NAVY },
});
