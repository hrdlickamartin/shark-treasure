import { useMemo, useRef, useState } from 'react';
import { type GestureResponderEvent, PanResponder, Platform, StyleSheet, View } from 'react-native';
import type { Input } from '../game/types';
import { COLORS } from './theme';

interface Props {
  size: number;
  inputRef: React.RefObject<Input>;
  left: number;
  bottom: number;
}

const DEAD_ZONE = 0.12;

export function Joystick({ size, inputRef, left, bottom }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const radius = size / 2;
  const knobSize = size * 0.44;
  const touch = useRef<{ id: string | null; cx: number; cy: number }>({ id: null, cx: 0, cy: 0 });

  const controls = useMemo(() => {
    const update = (dx: number, dy: number) => {
      const len = Math.hypot(dx, dy);
      const max = radius * 0.72;
      const k = len > max ? max / len : 1;
      const x = dx * k;
      const y = dy * k;
      setKnob({ x, y });
      const nx = x / max;
      const ny = y / max;
      inputRef.current = { x: Math.abs(nx) < DEAD_ZONE ? 0 : nx, y: Math.abs(ny) < DEAD_ZONE ? 0 : ny };
    };
    const release = () => {
      touch.current.id = null;
      setKnob({ x: 0, y: 0 });
      inputRef.current = { x: 0, y: 0 };
    };

    if (Platform.OS === 'web') {
      const origin = { x: 0, y: 0 };
      const responder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          origin.x = e.nativeEvent.locationX;
          origin.y = e.nativeEvent.locationY;
          update(origin.x - radius, origin.y - radius);
        },
        onPanResponderMove: (_, g) => update(origin.x - radius + g.dx, origin.y - radius + g.dy),
        onPanResponderRelease: release,
        onPanResponderTerminate: release,
      });
      return responder.panHandlers;
    }

    const find = (e: GestureResponderEvent) => e.nativeEvent.changedTouches.find((t) => String(t.identifier) === touch.current.id);
    return {
      onTouchStart: (e: GestureResponderEvent) => {
        if (touch.current.id !== null) return;
        const t = e.nativeEvent.changedTouches[0] ?? e.nativeEvent;
        touch.current = {
          id: String(t.identifier),
          cx: t.pageX - t.locationX + radius,
          cy: t.pageY - t.locationY + radius,
        };
        update(t.locationX - radius, t.locationY - radius);
      },
      onTouchMove: (e: GestureResponderEvent) => {
        const t = find(e);
        if (t) update(t.pageX - touch.current.cx, t.pageY - touch.current.cy);
      },
      onTouchEnd: (e: GestureResponderEvent) => {
        if (find(e)) release();
      },
      onTouchCancel: (e: GestureResponderEvent) => {
        if (find(e)) release();
      },
    };
  }, [inputRef, radius]);

  return (
    <View style={[styles.base, { left, bottom, width: size, height: size, borderRadius: radius }]} {...controls}>
      <View pointerEvents="none" style={[styles.ring, { borderRadius: radius }]} />
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.arrow,
            i === 0 && { top: 6, left: radius - 8 },
            i === 1 && { bottom: 6, left: radius - 8 },
            i === 2 && { left: 6, top: radius - 8 },
            i === 3 && { right: 6, top: radius - 8 },
          ]}
        >
          <View style={[styles.tri, { transform: [{ rotate: `${[0, 180, 270, 90][i]}deg` }] }]} />
        </View>
      ))}
      <View
        pointerEvents="none"
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            left: radius - knobSize / 2 + knob.x,
            top: radius - knobSize / 2 + knob.y,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', backgroundColor: 'rgba(8, 43, 89, 0.45)' },
  ring: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  arrow: { position: 'absolute', width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  tri: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.7)',
  },
  knob: {
    position: 'absolute',
    backgroundColor: COLORS.aqua,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
