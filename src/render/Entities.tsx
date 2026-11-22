import { Image, StyleSheet, Text, View } from 'react-native';
import { CHESTS, SHARKS } from '../game/catalog';
import { CLIMB } from '../game/systems/dive';
import { clamp } from '../game/rng';
import type { Chest, Coin, FishSchool, FloatText, GameState, Hazard, Particle, Shark } from '../game/types';
import { COLORS, FONTS, textShadow } from '../ui/theme';
import { RigSprite } from './RigSprite';
import { quarterWidth, Sprite, spriteHeight, turnPose } from './Sprite';
import { SPRITES, type SpriteName } from './spriteAssets';

export function ChestView({ chest, time, highlight }: { chest: Chest; time: number; highlight: boolean }) {
  const info = CHESTS[chest.kind];
  const bob = chest.falling ? 0 : Math.sin(chest.phase * 2) * 2.5;
  const pulse = 0.5 + Math.sin(time * 3 + chest.phase) * 0.25;
  const glowSize = info.width * 1.9;
  return (
    <>
      {(info.glow || highlight) && (
        <View
          style={[
            styles.glow,
            {
              left: chest.x - glowSize / 2,
              top: chest.y + bob - glowSize / 2,
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: info.glow ?? COLORS.gold,
              opacity: highlight ? 0.55 : pulse * 0.45,
            },
          ]}
        />
      )}
      <Sprite name={info.sprite} x={chest.x} y={chest.y + bob} width={info.width} rotate={chest.falling ? Math.sin(time * 6) * 8 : 0} />
      {chest.kind === 'legendary' && (
        <View style={[styles.sparkle, { left: chest.x + Math.cos(time * 2) * 26 - 3, top: chest.y + bob + Math.sin(time * 2.6) * 18 - 3 }]} />
      )}
    </>
  );
}

export function CoinView({ coin }: { coin: Coin }) {
  const spin = Math.abs(Math.cos(coin.phase * 3));
  return <Sprite name="coin" x={coin.x} y={coin.y + Math.sin(coin.phase * 2) * 3} width={22} scaleX={0.25 + spin * 0.75} />;
}

export function SharkView({ shark }: { shark: Shark }) {
  const info = SHARKS[shark.kind];
  const lunge = shark.mode === 'lunge' ? 1.6 : shark.mode === 'chase' ? 1.25 : 1;
  const bob = Math.sin(shark.phase * 0.35) * 3;
  const height = spriteHeight(info.sprite, info.width);
  const pose = turnPose(shark.turn);
  const flipSign = pose.flip ? -1 : 1;
  const quarter = `${info.sprite}_q` as SpriteName;
  return (
    <>
      {pose.quarter > 0.01 && (
        <Sprite
          name={quarter}
          x={shark.x}
          y={shark.y + bob}
          width={quarterWidth(quarter, info.sprite, info.width)}
          flip={pose.flip}
          rotate={Math.sin(shark.phase) * 3}
          scaleX={pose.quarterSqueeze}
          scaleY={1 + pose.bounce}
          opacity={pose.quarter}
        />
      )}
      {pose.side > 0.01 && (
        <RigSprite
          name={info.sprite}
          x={shark.x}
          y={shark.y + bob}
          width={info.width}
          scaleX={flipSign * pose.squeeze}
          rotate={flipSign < 0 ? -shark.tilt : shark.tilt}
          angles={[Math.sin(shark.phase) * 5 * lunge, Math.sin(shark.phase - 1.2) * 14 * lunge]}
          scaleY={1 + Math.sin(shark.phase * 2) * 0.012 + pose.bounce}
          opacity={pose.side}
        />
      )}
      {shark.alert > 0 && (
        <View style={[styles.alert, { left: shark.x - 13, top: shark.y - height / 2 - 34, transform: [{ scale: 1 + Math.sin(shark.alert * 20) * 0.15 }] }]}>
          <Text style={styles.alertText}>!</Text>
        </View>
      )}
    </>
  );
}

export function HazardView({ hazard, time }: { hazard: Hazard; time: number }) {
  if (hazard.kind === 'jelly') {
    const squash = Math.sin(hazard.phase * 3) * 0.08;
    return <Sprite name="jellyfish" x={hazard.x} y={hazard.y} width={48} scaleX={1 - squash} scaleY={1 + squash} opacity={0.95} />;
  }
  if (hazard.kind === 'mine') {
    const chain = hazard.anchorY - hazard.y;
    return (
      <>
        <View style={[styles.chain, { left: hazard.x - 1.5, top: hazard.y + 10, height: Math.max(0, chain - 10) }]} />
        <Sprite name="mine" x={hazard.x} y={hazard.y} width={52} rotate={Math.sin(time + hazard.phase) * 4} />
      </>
    );
  }
  return <Sprite name="urchin" x={hazard.x} y={hazard.y} width={40} />;
}

export function FishView({ school }: { school: FishSchool }) {
  const flip = school.vx < 0;
  return (
    <>
      {Array.from({ length: school.count }, (_, i) => {
        const ox = ((i * 37) % 70) - 35 + Math.sin(school.phase * 1.3 + i) * 6;
        const oy = ((i * 23) % 44) - 22 + Math.cos(school.phase * 1.7 + i * 2) * 4;
        return <Sprite key={i} name={school.sprite} x={school.x + ox} y={school.y + oy} width={school.size} flip={flip} rotate={Math.sin(school.phase * 4 + i) * 6} />;
      })}
    </>
  );
}

const PARTICLE_COLORS: Record<string, string> = {
  spark: '#FFF4B0',
  coin: COLORS.gold,
  boom: '#FF9A3C',
  splash: '#FFFFFF',
};

export function ParticleView({ p }: { p: Particle }) {
  const t = clamp(p.life / p.maxLife, 0, 1);
  if (p.kind === 'bubble') {
    return <View style={[styles.bubble, { left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, borderRadius: p.size, opacity: Math.min(1, t * 2) }]} />;
  }
  if (p.kind === 'streak') {
    return <View style={[styles.streak, { left: p.x - p.size / 2, top: p.y, width: p.size, opacity: Math.sin(t * Math.PI) * 0.5 }]} />;
  }
  const size = p.kind === 'boom' ? p.size * (1.6 - t) : p.size * (0.4 + t * 0.6);
  return (
    <View
      style={{
        position: 'absolute',
        left: p.x - size / 2,
        top: p.y - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: PARTICLE_COLORS[p.kind],
        opacity: t,
        borderWidth: p.kind === 'coin' ? 1.5 : 0,
        borderColor: '#C98A12',
      }}
    />
  );
}

export function FloatTextView({ t }: { t: FloatText }) {
  return (
    <Text style={[styles.float, { left: t.x - 120, top: t.y - 14, color: t.color, opacity: clamp(t.life / 0.5, 0, 1) }]} numberOfLines={1}>
      {t.text}
    </Text>
  );
}

function ClimbView({ state }: { state: GameState }) {
  const { diver } = state;
  const t = diver.stateTime;
  const flip = diver.facing < 0;
  const dir = flip ? -1 : 1;
  const k = Math.min(1, (t - CLIMB.approach) / (CLIMB.climb - CLIMB.approach));
  if (t < CLIMB.climb && k < 0.7) {
    const pull = Math.abs(Math.sin(k * 2 * Math.PI));
    return (
      <Sprite
        name="diver_climb"
        x={diver.x}
        y={diver.y}
        width={40}
        flip={flip}
        scaleX={1 - pull * 0.04}
        scaleY={1 + pull * 0.07}
        rotate={dir * Math.sin(t * 12) * 2}
      />
    );
  }
  const land = t < CLIMB.over ? 0 : Math.min(1, (t - CLIMB.over) / (CLIMB.done - CLIMB.over));
  const squash = Math.sin(Math.PI * land) * 0.8;
  const lean = t < CLIMB.over ? Math.sin(Math.PI * Math.max(0, Math.min(1, (t - CLIMB.climb) / (CLIMB.over - CLIMB.climb)))) * 12 : 0;
  return <Sprite name="diver_idle" x={diver.x} y={diver.y + squash * 4} width={34} flip={flip} rotate={dir * lean} scaleX={1 + squash * 0.1} scaleY={1 - squash * 0.14} />;
}

export function DiverView({ state }: { state: GameState }) {
  const { diver, time } = state;
  const { anim } = diver;
  if (diver.state === 'climbing' && diver.stateTime >= CLIMB.approach) return <ClimbView state={state} />;
  const speed = Math.hypot(diver.vx, diver.vy);
  const pose = turnPose(anim.turn);
  const flipSign = pose.flip ? -1 : 1;
  const blink = diver.invuln > 0 && Math.floor(time * 12) % 2 === 0 ? 0.35 : 1;
  const hurtMix = diver.state === 'rescue' ? 1 : clamp(diver.hurt * 4, 0, 1);
  const idleMix = diver.state === 'climbing' ? 0 : clamp((anim.idle - 0.3) / 0.4, 0, 1) * (1 - hurtMix);
  const swimMix = (diver.state === 'climbing' ? 1 : 1 - clamp((anim.idle - 0.5) / 0.4, 0, 1)) * (1 - hurtMix);
  const carrying = diver.carried.length > 0;
  const amp = diver.state === 'climbing' ? 1 : 0.35 + 0.65 * clamp(speed / state.stats.speed, 0, 1);
  const bob = Math.sin(time * 2.4) * 3 * anim.idle;
  const tilt = flipSign < 0 ? -anim.tilt : anim.tilt;
  const glow = carrying && diver.state === 'diving';
  const glowSize = 92 + Math.sin(time * 4) * 8;
  const swimName = carrying ? 'diver_carry' : 'diver_swim1';
  const quarterName = carrying ? 'diver_carry_q' : 'diver_swim_q';
  return (
    <>
      {glow && (
        <View
          style={[
            styles.glow,
            { left: diver.x - glowSize / 2, top: diver.y - glowSize / 2, width: glowSize, height: glowSize, borderRadius: glowSize, backgroundColor: COLORS.gold, opacity: 0.22 + diver.collectFlash * 0.5 },
          ]}
        />
      )}
      {swimMix * pose.quarter > 0.01 && (
        <Sprite
          name={quarterName}
          x={diver.x}
          y={diver.y + bob}
          width={quarterWidth(quarterName, swimName, 78)}
          flip={pose.flip}
          rotate={tilt * 0.5}
          scaleX={pose.quarterSqueeze}
          scaleY={1 + pose.bounce}
          opacity={swimMix * pose.quarter * blink}
        />
      )}
      {swimMix * pose.side > 0.01 && (
        <RigSprite
          name={swimName}
          x={diver.x}
          y={diver.y + bob}
          width={78}
          scaleX={flipSign * pose.squeeze}
          scaleY={1 + pose.bounce}
          rotate={tilt}
          angles={[Math.sin(anim.kick) * 10 * amp, Math.sin(anim.kick - 1.1) * 18 * amp]}
          opacity={swimMix * pose.side * blink}
        />
      )}
      {idleMix > 0.01 && (
        <Sprite
          name={carrying && diver.state === 'diving' ? 'diver_carry' : 'diver_idle'}
          x={diver.x}
          y={diver.y + bob}
          width={carrying && diver.state === 'diving' ? 78 : 34}
          scaleX={0.55 + 0.45 * Math.abs(anim.turn)}
          scaleY={1 + pose.bounce}
          flip={pose.flip}
          rotate={Math.sin(time * 1.6) * 4 * flipSign}
          opacity={idleMix * blink}
        />
      )}
      {hurtMix > 0.01 && (
        <Sprite name="diver_hurt" x={diver.x} y={diver.y} width={66} flip={flipSign < 0} rotate={Math.sin(time * 28) * 10 * hurtMix} opacity={hurtMix * blink} />
      )}
      {diver.state === 'rescue' && <Sprite name="icon_vest" x={diver.x} y={diver.y + 6} width={44} opacity={0.95} />}
    </>
  );
}

const BOAT_SPRITES: SpriteName[] = ['boat', 'boat_1', 'boat_2', 'boat_3', 'boat_4', 'boat_5'];
const BOAT_SINK = [0.2, 0.26, 0.2, 0.18, 0.2, 0.17];

export function BoatView({ state }: { state: GameState }) {
  const { boat, time, stats } = state;
  const level = Math.min(BOAT_SPRITES.length - 1, stats.boatLevel);
  const sprite = BOAT_SPRITES[level];
  const height = 166 * (1 + level * 0.07);
  const width = height * SPRITES[sprite].aspect;
  const bob = Math.sin(time * 1.7) * 3;
  const rotate = Math.sin(time * 1.2) * 2.2 + clamp(boat.vx / 400, -1, 1) * -3;
  const p = 1 - boat.turnFx;
  const swing = boat.turnFx > 0 ? Math.sin(Math.PI * p) : 0;
  return (
    <Sprite
      name={sprite}
      x={boat.x}
      y={height * BOAT_SINK[level] + bob - swing * 10}
      width={width}
      anchor="bottom"
      rotate={rotate + (boat.turnFx > 0 ? Math.sin(2 * Math.PI * p) * 7 : 0)}
      flip={boat.shown < 0}
      scaleX={1 - swing * 0.35}
      scaleY={1 + swing * 0.08}
    />
  );
}

const WAVE_BACK = require('../../assets/fx/wave_back.png');
const WAVE_FRONT = require('../../assets/fx/wave_front.png');
const WAVE_TILE = 512;

function WaveLayer({ source, left, width, offset, top }: { source: number; left: number; width: number; offset: number; top: number }) {
  const start = Math.floor((left + offset) / WAVE_TILE) * WAVE_TILE - offset;
  const count = Math.ceil(width / WAVE_TILE) + 2;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Image key={i} source={source} fadeDuration={0} style={{ position: 'absolute', left: start + i * WAVE_TILE, top, width: WAVE_TILE + 1, height: 48 }} />
      ))}
    </>
  );
}

export function WavesView({ left, width, time }: { left: number; width: number; time: number }) {
  return (
    <>
      <WaveLayer source={WAVE_BACK} left={left} width={width} offset={-time * 22} top={-20 + Math.sin(time * 1.3) * 2} />
      <WaveLayer source={WAVE_FRONT} left={left} width={width} offset={time * 30} top={-14 + Math.sin(time * 1.7 + 1) * 2} />
    </>
  );
}

export function SonarRing({ x, y, progress, range }: { x: number; y: number; progress: number; range: number }) {
  const size = range * 2 * progress;
  return (
    <View
      style={[
        styles.sonar,
        { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, opacity: (1 - progress) * 0.8 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  sparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF6C8' },
  alert: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.coral,
    borderWidth: 2,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 18, lineHeight: 22 },
  chain: { position: 'absolute', width: 3, backgroundColor: 'rgba(30, 40, 60, 0.8)' },
  bubble: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.18)' },
  streak: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: '#E6FBFF' },
  float: { position: 'absolute', width: 240, textAlign: 'center', fontFamily: FONTS.title, fontSize: 20, ...textShadow },
  sonar: { position: 'absolute', borderWidth: 3, borderColor: COLORS.seaweed },
});
