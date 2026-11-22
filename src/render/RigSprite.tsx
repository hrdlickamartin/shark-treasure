import { Image, View } from 'react-native';
import { RIGS } from './rigs';
import { SPRITES, type SpriteName } from './spriteAssets';

const OVERLAP = 3;

interface Props {
  name: SpriteName;
  x: number;
  y: number;
  width: number;
  scaleX: number;
  rotate: number;
  angles: [number, number];
  opacity?: number;
  scaleY?: number;
}

function Strip({ name, from, to, width, height }: { name: SpriteName; from: number; to: number; width: number; height: number }) {
  return (
    <View style={{ position: 'absolute', left: from, top: 0, width: Math.max(0, to - from), height, overflow: 'hidden' }}>
      <Image source={SPRITES[name].source} fadeDuration={0} style={{ position: 'absolute', left: -from, top: 0, width, height }} />
    </View>
  );
}

export function RigSprite({ name, x, y, width, scaleX, rotate, angles, opacity = 1, scaleY = 1 }: Props) {
  const rig = RIGS[name]!;
  const height = width / SPRITES[name].aspect;
  const body = rig.cuts[0] * width;
  const tail = rig.cuts[1] * width;
  const box = { position: 'absolute' as const, left: 0, top: 0, width, height };
  return (
    <View
      style={{
        ...box,
        left: x - width / 2,
        top: y - height / 2,
        opacity,
        transform: [{ rotate: `${rotate}deg` }, { scaleX }, { scaleY }],
      }}
    >
      <View style={{ ...box, transformOrigin: `${body}px ${rig.pivots[0] * height}px`, transform: [{ rotate: `${angles[0]}deg` }] }}>
        <View style={{ ...box, transformOrigin: `${tail}px ${rig.pivots[1] * height}px`, transform: [{ rotate: `${angles[1]}deg` }] }}>
          <Strip name={name} from={0} to={tail + OVERLAP} width={width} height={height} />
        </View>
        <Strip name={name} from={tail} to={body + OVERLAP} width={width} height={height} />
      </View>
      <Strip name={name} from={body} to={width} width={width} height={height} />
    </View>
  );
}
