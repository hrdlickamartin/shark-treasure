import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { SPRITES, type SpriteName } from './spriteAssets';

interface SpriteProps {
  name: SpriteName;
  x: number;
  y: number;
  width: number;
  flip?: boolean;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  anchor?: 'center' | 'bottom';
  style?: StyleProp<ImageStyle>;
}

export function spriteHeight(name: SpriteName, width: number): number {
  return width / SPRITES[name].aspect;
}

export function Sprite({ name, x, y, width, flip, rotate = 0, scaleX = 1, scaleY = 1, opacity = 1, anchor = 'center', style }: SpriteProps) {
  const height = spriteHeight(name, width);
  const top = anchor === 'bottom' ? y - height : y - height / 2;
  return (
    <Image
      source={SPRITES[name].source}
      fadeDuration={0}
      style={[
        {
          position: 'absolute',
          left: x - width / 2,
          top,
          width,
          height,
          opacity,
          transform: [{ rotate: `${rotate}deg` }, { scaleX: (flip ? -1 : 1) * scaleX }, { scaleY }],
        },
        style,
      ]}
    />
  );
}

export function Icon({ name, size, style }: { name: SpriteName; size: number; style?: StyleProp<ImageStyle> }) {
  const aspect = SPRITES[name].aspect;
  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;
  return <Image source={SPRITES[name].source} fadeDuration={0} style={[{ width, height }, style]} />;
}

export interface TurnPose {
  flip: boolean;
  side: number;
  quarter: number;
  squeeze: number;
  quarterSqueeze: number;
  bounce: number;
}

const ramp = (v: number) => Math.max(0, Math.min(1, v));

export function turnPose(turn: number): TurnPose {
  const a = Math.min(1, Math.abs(turn));
  const e = a * a * (3 - 2 * a);
  return {
    flip: turn < 0,
    side: ramp((e - 0.45) / 0.15),
    quarter: e < 0.6 ? 1 : 0,
    squeeze: 0.72 + 0.28 * ramp((e - 0.4) / 0.6),
    quarterSqueeze: 0.55 + 0.45 * ramp(e / 0.45),
    bounce: Math.sin(Math.PI * (1 - e)) * 0.05,
  };
}

export function quarterWidth(quarter: SpriteName, side: SpriteName, sideWidth: number): number {
  return spriteHeight(side, sideWidth) * 1.12 * SPRITES[quarter].aspect;
}
