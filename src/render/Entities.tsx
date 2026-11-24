import { memo } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { CHESTS, SHARKS } from '../game/catalog';
import { CLIMB } from '../game/systems/dive';
import { clamp } from '../game/rng';
import type { Balloon, Chest, FishSchool, Prop, FloatText, GameState, HarpoonShot, HarpoonTarget, Hazard, Particle, Shark } from '../game/types';
import { BOSS_DEATH_TIME, SHARK_DEATH_TIME } from '../game/systems/extras';
import { COLORS, FONTS, textShadow } from '../ui/theme';
import { skinned } from '../progression/skins';
import { finClock, spinClock, swayClocks, wobble } from './clocks';
import { RAY_FIELD, SPIKE_OUT, SPIKE_WARN, spikeExtension, spikePhase } from '../game/systems/creatures';
import { RigSprite } from './RigSprite';
import { quarterWidth, Sprite, spriteHeight, turnPose } from './Sprite';
import { SPRITES, type SpriteName } from './spriteAssets';
import { RIGS } from './rigs';

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

const COIN_SIZE = 22;
const COIN_HEIGHT = spriteHeight('coin', COIN_SIZE);
const coinSpin = spinClock.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.72, 0.25, 0.72, 1] });
const coinBob = wobble(swayClocks[0], 3);

export const CoinView = memo(function CoinView({ x, y }: { x: number; y: number }) {
  return (
    <Animated.Image
      source={SPRITES.coin.source}
      fadeDuration={0}
      style={{ position: 'absolute', left: x - COIN_SIZE / 2, top: y - COIN_HEIGHT / 2, width: COIN_SIZE, height: COIN_HEIGHT, transform: [{ translateY: coinBob }, { scaleX: coinSpin }] }}
    />
  );
});

function sharkAngles(sprite: SpriteName, phase: number, lunge: number): number[] {
  const joints = RIGS[sprite]?.cuts.length ?? 2;
  if (joints <= 2) return [Math.sin(phase) * 5 * lunge, Math.sin(phase - 1.2) * 14 * lunge];
  return Array.from({ length: joints }, (_, i) => Math.sin(phase - i * 1.3) * 6 * lunge);
}

export function SharkView({ shark }: { shark: Shark }) {
  const info = SHARKS[shark.kind];
  const lunge = shark.mode === 'lunge' ? 1.6 : shark.mode === 'chase' ? 1.25 : 1;
  const bob = Math.sin(shark.phase * 0.35) * 3;
  const height = spriteHeight(info.sprite, info.width);
  const pose = turnPose(shark.turn);
  const flipSign = pose.flip ? -1 : 1;
  const quarter = `${info.sprite}_q` as SpriteName;
  const hasQuarter = quarter in SPRITES;
  const sideOpacity = hasQuarter ? pose.side : 1;
  const death = shark.dying > 0 ? 1 - shark.dying / (info.boss ? BOSS_DEATH_TIME : SHARK_DEATH_TIME) : 0;
  const fade = (1 - clamp((death - 0.5) * 2, 0, 1)) * (shark.hitFlash > 0 && Math.floor(shark.hitFlash * 24) % 2 === 0 ? 0.35 : 1);
  const roll = clamp(death * 2, 0, 1) * 160;
  return (
    <>
      {hasQuarter && pose.quarter > 0.01 && (
        <Sprite
          name={quarter}
          x={shark.x}
          y={shark.y + bob}
          width={quarterWidth(quarter, info.sprite, info.width)}
          flip={pose.flip}
          rotate={Math.sin(shark.phase) * 3 + roll}
          scaleX={pose.quarterSqueeze}
          scaleY={1 + pose.bounce}
          opacity={pose.quarter * fade}
        />
      )}
      {sideOpacity > 0.01 && (
        <RigSprite
          name={info.sprite}
          x={shark.x}
          y={shark.y + bob}
          width={info.width}
          scaleX={flipSign * pose.squeeze}
          rotate={(flipSign < 0 ? -shark.tilt : shark.tilt) + roll * flipSign}
          angles={sharkAngles(info.sprite, shark.phase, shark.dying > 0 ? 0.3 : lunge)}
          scaleY={1 + Math.sin(shark.phase * 2) * 0.012 + pose.bounce}
          opacity={sideOpacity * fade}
        />
      )}
      {shark.mode === 'telegraph' && (
        <View
          style={[
            styles.glow,
            {
              left: shark.x + shark.facing * info.width * 0.32 - 40,
              top: shark.y - 40,
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FF3B30',
              opacity: 0.35 + Math.sin(shark.phase * 6) * 0.25,
            },
          ]}
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

export function HarpoonShotView({ shot }: { shot: HarpoonShot }) {
  const angle = (Math.atan2(shot.vy, shot.vx) * 180) / Math.PI;
  return (
    <View style={[styles.spear, { left: shot.x - 40, top: shot.y - 7, transform: [{ rotate: `${angle}deg` }] }]}>
      <View style={styles.spearShaft} />
      <View style={styles.spearTip} />
      <View style={styles.spearFin} />
    </View>
  );
}

export function BossHealth({ shark }: { shark: Shark }) {
  const info = SHARKS[shark.kind];
  const height = spriteHeight(info.sprite, info.width);
  return (
    <View style={[styles.bossBar, { left: shark.x - 60, top: shark.y - height / 2 - 26 }]}>
      {Array.from({ length: shark.maxHp }, (_, i) => (
        <View key={i} style={[styles.bossPip, { backgroundColor: i < shark.hp ? COLORS.coral : 'rgba(4, 27, 61, 0.7)' }]} />
      ))}
    </View>
  );
}

const RETICLE = 58;

export function HarpoonReticle({ target, time }: { target: HarpoonTarget; time: number }) {
  const size = RETICLE * (target.boss ? 1.6 : 1) * (1 + Math.sin(time * 8) * 0.06);
  return (
    <View style={[styles.reticle, { left: target.x - size / 2, top: target.y - size / 2, width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${(time * 90) % 360}deg` }] }]}>
      <View style={[styles.reticleTick, { left: size / 2 - 1.5, top: -6 }]} />
      <View style={[styles.reticleTick, { left: size / 2 - 1.5, bottom: -6 }]} />
      <View style={[styles.reticleTick, { top: size / 2 - 5, left: -4, transform: [{ rotate: '90deg' }] }]} />
      <View style={[styles.reticleTick, { top: size / 2 - 5, right: -4, transform: [{ rotate: '90deg' }] }]} />
    </View>
  );
}

export function HazardView({ hazard, time }: { hazard: Hazard; time: number }) {
  switch (hazard.kind) {
    case 'jelly': {
      const squash = Math.sin(hazard.phase * 3) * 0.08;
      return <Sprite name="jellyfish" x={hazard.x} y={hazard.y} width={48} scaleX={1 - squash} scaleY={1 + squash} opacity={0.95} />;
    }
    case 'mine': {
      const chain = hazard.anchorY - hazard.y;
      return (
        <>
          <View style={[styles.chain, { left: hazard.x - 1.5, top: hazard.y + 10, height: Math.max(0, chain - 10) }]} />
          <Sprite name="mine" x={hazard.x} y={hazard.y} width={52} rotate={Math.sin(time + hazard.phase) * 4} />
        </>
      );
    }
    case 'octopus': {
      const pulse = Math.sin(hazard.phase * 4) * 0.08;
      return <Sprite name="octopus" x={hazard.x} y={hazard.y} width={60} scaleX={1 + pulse} scaleY={1 - pulse} rotate={Math.max(-20, Math.min(20, hazard.vx * 0.08))} />;
    }
    case 'eel':
      return <EelView hazard={hazard} time={time} />;
    case 'debris':
      return (
        <Sprite
          name="debris"
          x={hazard.x}
          y={hazard.y}
          width={64}
          rotate={hazard.state === 2 ? time * 260 : hazard.state === 1 ? Math.sin(time * 40) * 8 : 15}
          opacity={hazard.state === 3 ? Math.min(1, hazard.timer) : 1}
        />
      );
    case 'crab':
      return null;
    case 'angler':
      return <AnglerView hazard={hazard} />;
    case 'ray':
      return <RayView hazard={hazard} time={time} />;
    case 'toxic':
      return <ToxicView hazard={hazard} time={time} />;
    case 'spikes':
      return <SpikesView hazard={hazard} time={time} />;
    default:
      return <Sprite name="urchin" x={hazard.x} y={hazard.y} width={40} />;
  }
}

const ANGLER_WIDTH = 110;
const LURE = { x: 0.415, y: -0.2 };

export function anglerLure(hazard: Hazard): { x: number; y: number } {
  const height = spriteHeight('anglerfish', ANGLER_WIDTH);
  return { x: hazard.x + hazard.dir * LURE.x * ANGLER_WIDTH, y: hazard.y + LURE.y * height };
}

function AnglerView({ hazard }: { hazard: Hazard }) {
  const lunge = hazard.state === 1;
  const squash = lunge ? 0.12 : Math.sin(hazard.phase * 2) * 0.03;
  return (
    <Sprite
      name="anglerfish"
      x={hazard.x}
      y={hazard.y}
      width={ANGLER_WIDTH}
      flip={hazard.dir < 0}
      scaleX={1 + squash}
      scaleY={1 - squash}
      rotate={Math.max(-15, Math.min(15, hazard.vy * 0.03 * (hazard.state === 1 ? 1 : 0)))}
    />
  );
}

export function LureGlow({ hazard, time }: { hazard: Hazard; time: number }) {
  const lure = anglerLure(hazard);
  const size = 34 + Math.sin(time * 3 + hazard.phase) * 6;
  return (
    <>
      <View style={[styles.glow, { left: lure.x - size, top: lure.y - size, width: size * 2, height: size * 2, borderRadius: size, backgroundColor: '#E8FF7A', opacity: 0.22 }]} />
      <View style={[styles.lure, { left: lure.x - 6, top: lure.y - 6 }]} />
    </>
  );
}

function RayView({ hazard, time }: { hazard: Hazard; time: number }) {
  const charging = hazard.state === 1;
  const discharging = hazard.state === 2;
  const jitter = charging ? Math.sin(time * 60) * 2 : 0;
  const field = RAY_FIELD * 2 * (discharging ? 1 - hazard.timer / 0.45 * 0.3 : 1);
  return (
    <>
      {charging && (
        <View style={[styles.glow, { left: hazard.x - 50, top: hazard.y - 50, width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.gold, opacity: 0.25 + Math.abs(Math.sin(time * 18)) * 0.3 }]} />
      )}
      {discharging && (
        <View style={[styles.rayField, { left: hazard.x - field / 2, top: hazard.y - field / 2, width: field, height: field, borderRadius: field / 2, opacity: Math.min(1, hazard.timer / 0.3) }]} />
      )}
      <Sprite name="electric_ray" x={hazard.x + jitter} y={hazard.y} width={100} flip={hazard.dir < 0} rotate={Math.sin(hazard.phase * 1.1) * 6} scaleY={1 + Math.sin(hazard.phase * 3) * 0.05} />
    </>
  );
}

function ToxicView({ hazard, time }: { hazard: Hazard; time: number }) {
  const r = hazard.size;
  const blobs = [
    { dx: -0.35, dy: 0.1, k: 0.7 },
    { dx: 0.3, dy: -0.15, k: 0.75 },
    { dx: 0.05, dy: 0.3, k: 0.6 },
  ];
  return (
    <>
      {blobs.map((b, i) => {
        const size = r * b.k * (1 + Math.sin(time * 1.3 + i * 2) * 0.08) * 2;
        return (
          <View
            key={i}
            style={[styles.toxic, { left: hazard.x + b.dx * r - size / 2, top: hazard.y + b.dy * r - size / 2, width: size, height: size, borderRadius: size / 2, opacity: 0.35 + Math.sin(time * 2 + i) * 0.08 }]}
          />
        );
      })}
      <View style={[styles.toxicEdge, { left: hazard.x - r, top: hazard.y - r, width: r * 2, height: r * 2, borderRadius: r }]} />
    </>
  );
}

const SPIKE_WIDTH = 60;

function SpikesView({ hazard, time }: { hazard: Hazard; time: number }) {
  const extension = spikeExtension(hazard);
  const warning = spikePhase(hazard) >= SPIKE_WARN && spikePhase(hazard) < SPIKE_OUT;
  const height = spriteHeight('spike_trap', SPIKE_WIDTH);
  return (
    <View style={[styles.spikeBase, { left: hazard.x, top: hazard.y, transform: [{ rotate: `${hazard.angle}deg` }] }]}>
      {warning && <View style={[styles.glow, { left: -30, top: -34, width: 60, height: 40, borderRadius: 20, backgroundColor: COLORS.coral, opacity: 0.35 + Math.abs(Math.sin(time * 20)) * 0.3 }]} />}
      <Image
        source={SPRITES.spike_trap.source}
        fadeDuration={0}
        style={{ position: 'absolute', left: -SPIKE_WIDTH / 2, top: -height, width: SPIKE_WIDTH, height, transformOrigin: 'bottom', transform: [{ scaleY: extension }] }}
      />
    </View>
  );
}

const EEL_WIDTH = 120;
const EEL_REACH = 96;
const EEL_CLIP = 160;

function EelView({ hazard, time }: { hazard: Hazard; time: number }) {
  const lunging = hazard.state > 0;
  const raw = lunging ? hazard.timer : Math.max(hazard.timer, 0.26 + Math.sin(hazard.phase * 1.6) * 0.06);
  const ext = 1 - Math.pow(1 - Math.min(1, raw), 3);
  const tip = ext * EEL_REACH + 14;
  const height = spriteHeight('eel', EEL_WIDTH);
  const dir = hazard.dir;
  const centerX = dir > 0 ? tip - EEL_WIDTH / 2 : EEL_CLIP - tip + EEL_WIDTH / 2;
  const wave = 0.35 + ext * 0.9;
  const bite = hazard.state === 1 ? 1 + Math.abs(Math.sin(time * 30)) * 0.08 : 1;
  return (
    <>
      <View style={[styles.hole, { left: hazard.x - 18, top: hazard.y - 16 }]} />
      <View style={{ position: 'absolute', left: dir > 0 ? hazard.x : hazard.x - EEL_CLIP, top: hazard.y - height, width: EEL_CLIP, height: height * 2, overflow: 'hidden' }}>
        <RigSprite
          name="eel"
          x={centerX}
          y={height + Math.sin(hazard.phase * 2.2) * 3 * (1 - ext)}
          width={EEL_WIDTH}
          scaleX={dir}
          scaleY={bite}
          rotate={dir * Math.sin(hazard.phase * 1.3) * 6 * (1 - ext)}
          angles={[Math.sin(time * 7 + hazard.phase) * 9 * wave, Math.sin(time * 7 + hazard.phase - 1.3) * 16 * wave]}
        />
      </View>
      <Sprite name="rock_small" x={hazard.x - dir * 6} y={hazard.y + 22} width={64} anchor="bottom" flip={dir < 0} />
    </>
  );
}

export function CrabView({ hazard, time }: { hazard: Hazard; time: number }) {
  const fleeing = hazard.state === 1;
  const hop = fleeing ? Math.abs(Math.sin(time * 18)) * 5 : Math.abs(Math.sin(time * 3)) * 2;
  const snap = fleeing ? 1 : 1 + Math.max(0, Math.sin(time * 5 + hazard.phase)) * 0.08;
  const glow = 70 + Math.sin(time * 4) * 6;
  return (
    <>
      {!fleeing && (
        <View
          style={[
            styles.glow,
            { left: hazard.x - glow / 2, top: hazard.y - glow / 2 - hop, width: glow, height: glow, borderRadius: glow, backgroundColor: COLORS.coral, opacity: 0.28 + Math.sin(time * 4) * 0.1 },
          ]}
        />
      )}
      <Sprite name="crab" x={hazard.x} y={hazard.y - hop} width={56} rotate={hazard.dir * 12} flip={hazard.dir < 0} scaleX={snap} scaleY={snap} opacity={fleeing ? Math.min(1, hazard.timer * 1.5) : 1} />
      {!fleeing && (
        <View style={[styles.crabArrow, { left: hazard.x + hazard.dir * 30 - 7, top: hazard.y - 18 - hop, transform: [{ rotate: hazard.dir > 0 ? '0deg' : '180deg' }] }]} />
      )}
    </>
  );
}

export function BalloonView({ balloon, time }: { balloon: Balloon; time: number }) {
  const chest = CHESTS[balloon.chest.kind];
  const sway = Math.sin(balloon.phase * 2) * 6;
  return (
    <>
      <Sprite name={chest.sprite} x={balloon.x} y={balloon.y + 18} width={chest.width * 0.8} rotate={sway * 0.6} />
      <Sprite name="balloon" x={balloon.x} y={balloon.y - 24} width={40} rotate={sway} scaleY={1 + Math.sin(time * 3) * 0.03} />
    </>
  );
}

const fishSway = swayClocks.map((clock, i) => [wobble(clock, 6), wobble(clock, i % 2 ? 4 : -4)]);
const fishFin = [0, 1, 2].map((i) =>
  finClock.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', `${i % 2 ? -6 : 6}deg`, '0deg', `${i % 2 ? 6 : -6}deg`, '0deg'] }),
);

const FishMember = memo(function FishMember({ sprite, size, index }: { sprite: SpriteName; size: number; index: number }) {
  const height = spriteHeight(sprite, size);
  const [swayX, swayY] = fishSway[index % 3];
  return (
    <Animated.Image
      source={SPRITES[sprite].source}
      fadeDuration={0}
      style={{
        position: 'absolute',
        left: ((index * 37) % 70) - 35 - size / 2,
        top: ((index * 23) % 44) - 22 - height / 2,
        width: size,
        height,
        transform: [{ translateX: swayX }, { translateY: swayY }, { rotate: fishFin[(index + 1) % 3] }],
      }}
    />
  );
});

export function FishView({ school }: { school: FishSchool }) {
  return (
    <View style={[styles.school, { left: school.x, top: school.y, transform: [{ scaleX: school.vx < 0 ? -1 : 1 }] }]}>
      {Array.from({ length: school.count }, (_, i) => (
        <FishMember key={i} sprite={school.sprite} size={school.size} index={i} />
      ))}
    </View>
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
  if (p.kind === 'rain') {
    return <View style={[styles.rain, { left: p.x, top: p.y, height: p.size, opacity: 0.6 }]} />;
  }
  if (p.kind === 'ink' || p.kind === 'cloud') {
    return (
      <View
        style={{
          position: 'absolute',
          left: p.x - p.size / 2,
          top: p.y - p.size / 2,
          width: p.size,
          height: p.size,
          borderRadius: p.size,
          backgroundColor: p.kind === 'ink' ? '#120A24' : '#7BE36A',
          opacity: t * (p.kind === 'ink' ? 0.8 : 0.35),
        }}
      />
    );
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
        name={skinned('diver_climb', state.skin)}
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
  return <Sprite name={skinned('diver_idle', state.skin)} x={diver.x} y={diver.y + squash * 4} width={34} flip={flip} rotate={dir * lean} scaleX={1 + squash * 0.1} scaleY={1 - squash * 0.14} />;
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
  const swimName = skinned(carrying ? 'diver_carry' : 'diver_swim1', state.skin);
  const quarterName = skinned(carrying ? 'diver_carry_q' : 'diver_swim_q', state.skin);
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
          name={skinned(carrying && diver.state === 'diving' ? 'diver_carry' : 'diver_idle', state.skin)}
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
        <Sprite name={skinned('diver_hurt', state.skin)} x={diver.x} y={diver.y} width={66} flip={flipSign < 0} rotate={Math.sin(time * 28) * 10 * hurtMix} opacity={hurtMix * blink} />
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

export function SubmarineView({ x, y, time, active }: { x: number; y: number; time: number; active: boolean }) {
  const bob = Math.sin(time * 1.4) * 4;
  const glow = 150 + Math.sin(time * 3) * 8;
  return (
    <>
      <View style={[styles.glow, { left: x - glow / 2, top: y + bob - glow / 2, width: glow, height: glow, borderRadius: glow, backgroundColor: COLORS.aqua, opacity: active ? 0.35 : 0.14 }]} />
      <Sprite name="submarine" x={x} y={y + bob} width={130} rotate={Math.sin(time * 0.9) * 3} />
    </>
  );
}

const PROP_GLOW: Partial<Record<Prop['kind'], string>> = {
  fragment: COLORS.gold,
  survivor: COLORS.coral,
  artifact: COLORS.gold,
  lever: COLORS.aqua,
  echo: COLORS.aqua,
  node: COLORS.aqua,
  vault: COLORS.gold,
  sealed: '#C9A24A',
};

function PropSprite({ prop, time }: { prop: Prop; time: number }) {
  const bob = Math.sin(prop.phase * 2.2) * 4;
  switch (prop.kind) {
    case 'fragment':
      return <Sprite name="map_fragment" x={prop.x} y={prop.y + bob} width={44} rotate={Math.sin(prop.phase * 1.3) * 8} />;
    case 'artifact':
      return <Sprite name={prop.sprite ?? 'map_fragment'} x={prop.x} y={prop.y + bob} width={40} rotate={Math.sin(prop.phase * 1.3) * 6} />;
    case 'survivor':
      return (
        <>
          <Sprite name="diver_hurt" x={prop.x} y={prop.y + bob} width={46} rotate={Math.sin(prop.phase * 2) * 10} />
          <View style={[styles.sos, { left: prop.x - 22, top: prop.y + bob - 54 }]}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
        </>
      );
    case 'lever':
      return <Sprite name="lever" x={prop.x} y={prop.y} width={56} anchor="center" flip={prop.active} />;
    case 'echo': {
      const ring = 30 + ((prop.phase * 30) % 40);
      return (
        <>
          {!prop.active && <View style={[styles.echoRing, { left: prop.x - ring, top: prop.y - ring, width: ring * 2, height: ring * 2, borderRadius: ring, opacity: 1 - (ring - 30) / 40 }]} />}
          <Sprite name={prop.sprite ?? 'icon_sonar'} x={prop.x} y={prop.y + bob} width={40} opacity={prop.active ? 0.45 : 1} />
        </>
      );
    }
    case 'node':
      return <Sprite name="energy_node" x={prop.x} y={prop.y + bob} width={56} opacity={prop.active ? 1 : 0.55} />;
    case 'vault':
      return <Sprite name={prop.active ? 'chest_legendary' : 'chest_sealed'} x={prop.x} y={prop.y} width={prop.active ? 62 : 70} />;
    case 'sealed':
      return (
        <>
          <Sprite name="chest_sealed" x={prop.x} y={prop.y} width={64} rotate={prop.active && prop.progress > 0 ? Math.sin(time * 40) * 2 : 0} />
          {prop.progress > 0 && (
            <View style={[styles.cutBar, { left: prop.x - 30, top: prop.y - 46 }]}>
              <View style={[styles.cutFill, { width: 60 * Math.min(1, prop.progress) }]} />
            </View>
          )}
        </>
      );
    case 'beacon':
      return prop.value ? <Sprite name="ice_crystal" x={prop.x} y={prop.y} width={58} /> : <Sprite name="thermal_beacon" x={prop.x} y={prop.y} width={52} />;
    case 'guardian': {
      const awake = !prop.active;
      return (
        <>
          {awake && <View style={[styles.glow, { left: prop.x - GUARDIAN_GLOW, top: prop.y - GUARDIAN_GLOW, width: GUARDIAN_GLOW * 2, height: GUARDIAN_GLOW * 2, borderRadius: GUARDIAN_GLOW, backgroundColor: COLORS.aqua, opacity: 0.12 + Math.abs(Math.sin(time * 2)) * 0.1 }]} />}
          <Sprite name="guardian" x={prop.x} y={prop.y + Math.sin(time * 1.2) * 8} width={130} opacity={awake ? 1 : 0.6} rotate={awake ? Math.sin(time * 0.8) * 4 : 12} />
        </>
      );
    }
    case 'cargo':
      return <Sprite name="chest_common" x={prop.x} y={prop.y + Math.sin(time * 2) * 3 - 6} width={48} rotate={Math.sin(time * 1.5) * 8} />;
    case 'merchant':
      return <Sprite name="boat_1" x={prop.x} y={prop.y + Math.sin(time * 1.4) * 2 - 30} width={170} flip />;
    default:
      return null;
  }
}

const GUARDIAN_GLOW = 170;

export function PropView({ prop, time }: { prop: Prop; time: number }) {
  if (prop.taken) return null;
  return <PropSprite prop={prop} time={time} />;
}

export function PropGlow({ prop, time }: { prop: Prop; time: number }) {
  if (prop.kind === 'beacon') {
    const r = 110 + Math.sin(time * 2 + prop.phase) * 8;
    return <View style={[styles.glow, { left: prop.x - r, top: prop.y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: prop.value ? COLORS.aqua : COLORS.orange, opacity: 0.16 }]} />;
  }
  const color = PROP_GLOW[prop.kind];
  if (prop.taken || !color) return null;
  if ((prop.kind === 'lever' || prop.kind === 'node' || prop.kind === 'echo') && prop.active) return null;
  if (prop.kind === 'vault' && !prop.active) return null;
  const size = 44 + Math.sin(time * 3 + prop.phase) * 6;
  return <View style={[styles.glow, { left: prop.x - size, top: prop.y - size, width: size * 2, height: size * 2, borderRadius: size, backgroundColor: color, opacity: 0.2 }]} />;
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
  school: { position: 'absolute', width: 1, height: 1 },
  echoRing: { position: 'absolute', borderWidth: 2, borderColor: COLORS.aqua },
  sos: { position: 'absolute', width: 44, height: 20, borderRadius: 10, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.navy },
  sosText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 11, lineHeight: 14 },
  cutBar: { position: 'absolute', width: 60, height: 8, borderRadius: 4, backgroundColor: 'rgba(4, 27, 61, 0.8)', overflow: 'hidden' },
  cutFill: { height: 8, backgroundColor: COLORS.gold },
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
  bossBar: { position: 'absolute', width: 120, flexDirection: 'row', gap: 4, padding: 3, borderRadius: 8, backgroundColor: 'rgba(4, 27, 61, 0.55)' },
  bossPip: { flex: 1, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.navy },
  spear: { position: 'absolute', width: 80, height: 14, justifyContent: 'center' },
  spearShaft: { position: 'absolute', left: 6, width: 62, height: 4, borderRadius: 2, backgroundColor: '#E6EEF5', borderWidth: 0.5, borderColor: '#5A6B7D' },
  spearTip: { position: 'absolute', right: 0, width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 16, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFBF32' },
  spearFin: { position: 'absolute', left: 0, width: 12, height: 12, borderRadius: 3, backgroundColor: '#FF7A3C' },
  reticle: { position: 'absolute', borderWidth: 3, borderColor: '#FFBF32', borderStyle: 'dashed' },
  reticleTick: { position: 'absolute', width: 3, height: 10, borderRadius: 1.5, backgroundColor: '#FFBF32' },
  streak: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: '#E6FBFF' },
  float: { position: 'absolute', width: 240, textAlign: 'center', fontFamily: FONTS.title, fontSize: 20, ...textShadow },
  sonar: { position: 'absolute', borderWidth: 3, borderColor: COLORS.seaweed },
  hole: { position: 'absolute', width: 36, height: 32, borderRadius: 18, backgroundColor: '#0A1022', borderWidth: 3, borderColor: '#24365E' },
  lure: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#F4FFB0', borderWidth: 2, borderColor: '#E8FF7A' },
  rayField: { position: 'absolute', borderWidth: 4, borderColor: '#FFE45C', backgroundColor: 'rgba(99, 201, 255, 0.25)' },
  toxic: { position: 'absolute', backgroundColor: '#7BE36A' },
  toxicEdge: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed', borderColor: '#B6F59A' },
  spikeBase: { position: 'absolute', width: 1, height: 1 },
  crabArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.coral,
  },
  rain: { position: 'absolute', width: 2, backgroundColor: '#DDEEFF', transform: [{ rotate: '8deg' }] },
});
