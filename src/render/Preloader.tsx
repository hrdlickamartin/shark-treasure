import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BACKGROUNDS, type BackgroundName, SPRITES, type SpriteName } from './spriteAssets';

const NAMES = Object.keys(SPRITES) as SpriteName[];

export const Preloader = memo(function Preloader({ backgrounds }: { backgrounds: BackgroundName[] }) {
  return (
    <View style={styles.root} pointerEvents="none">
      {NAMES.map((name) => (
        <Image key={name} source={SPRITES[name].source} style={styles.img} />
      ))}
      {backgrounds.map((name) => (
        <Image key={name} source={BACKGROUNDS[name]} style={styles.img} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, top: 0, width: 4, height: 4, opacity: 0.01, overflow: 'hidden' },
  img: { position: 'absolute', left: 0, top: 0, width: 4, height: 4 },
});
