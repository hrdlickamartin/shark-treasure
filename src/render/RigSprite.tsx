import { memo } from 'react';
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
  angles: number[];
  opacity?: number;
  scaleY?: number;
}

const Strip = memo(function Strip({ name, from, to, width, height }: { name: SpriteName; from: number; to: number; width: number; height: number }) {
  return (
    <View style={{ position: 'absolute', left: from, top: 0, width: Math.max(0, to - from), height, overflow: 'hidden' }}>
      <Image source={SPRITES[name].source} fadeDuration={0} style={{ position: 'absolute', left: -from, top: 0, width, height }} />
    </View>
  );
});

function Segments({ name, index, cuts, pivots, angles, width, height }: { name: SpriteName; index: number; cuts: number[]; pivots: number[]; angles: number[]; width: number; height: number }) {
  const at = cuts[index] * width;
  const next = index + 1 < cuts.length ? cuts[index + 1] * width : 0;
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width, height, transformOrigin: `${at}px ${pivots[index] * height}px`, transform: [{ rotate: `${angles[index] ?? 0}deg` }] }}>
      {index + 1 < cuts.length && <Segments name={name} index={index + 1} cuts={cuts} pivots={pivots} angles={angles} width={width} height={height} />}
      <Strip name={name} from={next} to={at + OVERLAP} width={width} height={height} />
    </View>
  );
}

export function RigSprite({ name, x, y, width, scaleX, rotate, angles, opacity = 1, scaleY = 1 }: Props) {
  const rig = RIGS[name];
  const height = width / SPRITES[name].aspect;
  if (!rig) {
    return (
      <Image
        source={SPRITES[name].source}
        fadeDuration={0}
        style={{ position: 'absolute', left: x - width / 2, top: y - height / 2, width, height, opacity, transform: [{ rotate: `${rotate + (angles[0] ?? 0) * 0.3}deg` }, { scaleX }, { scaleY }] }}
      />
    );
  }
  return (
    <View
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - height / 2,
        width,
        height,
        opacity,
        transform: [{ rotate: `${rotate}deg` }, { scaleX }, { scaleY }],
      }}
    >
      <Segments name={name} index={0} cuts={rig.cuts} pivots={rig.pivots} angles={angles} width={width} height={height} />
      <Strip name={name} from={rig.cuts[0] * width} to={width} width={width} height={height} />
    </View>
  );
}
