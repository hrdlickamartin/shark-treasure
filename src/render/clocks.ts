import { useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';

export const SURFACE_TILE = 512;

const NATIVE = Platform.OS !== 'web';

export const swayClocks = [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)];
export const glowClock = new Animated.Value(0);
export const waveClock = new Animated.Value(0);
export const surfaceClocks = [new Animated.Value(0), new Animated.Value(0)];
export const spinClock = new Animated.Value(0);
export const finClock = new Animated.Value(0);

const LOOPS: [Animated.Value, number, (t: number) => number][] = [
  [swayClocks[0], 3200, Easing.linear],
  [swayClocks[1], 4100, Easing.linear],
  [swayClocks[2], 5000, Easing.linear],
  [waveClock, 2600, Easing.linear],
  [glowClock, 2400, Easing.inOut(Easing.sin)],
  [surfaceClocks[0], (SURFACE_TILE / 22) * 1000, Easing.linear],
  [surfaceClocks[1], (SURFACE_TILE / 30) * 1000, Easing.linear],
  [spinClock, 1050, Easing.linear],
  [finClock, 1570, Easing.linear],
];

let started = false;

export function useClocks() {
  useEffect(() => {
    if (started) return;
    started = true;
    for (const [clock, duration, easing] of LOOPS) {
      const run = () => Animated.loop(Animated.timing(clock, { toValue: 1, duration, easing, useNativeDriver: NATIVE })).start(run);
      run();
    }
  }, []);
}

export const wobble = (clock: Animated.Value, amount: number) =>
  clock.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, amount, 0, -amount, 0] });
