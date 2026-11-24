import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MAX_HEALTH } from '../game/constants';
import type { GameState } from '../game/types';
import { KIT } from '../game/gear';
import { availableKit, selectedKit } from '../game/systems/kit';
import { Icon } from '../render/Sprite';
import type { SpriteName } from '../render/spriteAssets';
import { COLORS, FONTS, textShadow } from './theme';
import { TouchAction } from './TouchAction';

interface Props {
  state: GameState;
  right: number;
  bottom: number;
  onSonar: () => void;
  onBalloon: () => void;
  onRepellent: () => void;
  onMedkit: () => void;
  onScooter: () => void;
  onHarpoon: () => void;
  onCamera: () => void;
  onShutter: () => void;
  onPip: () => void;
  onKit: () => void;
  onKitCycle: () => void;
}

const BOX = 270;
const MAIN = 74;
const SMALL = 56;
const TOUCH_PAD = 6;
const INNER = 116;
const OUTER = 190;
const STEP = 74;
const GRID: [number, number][] = [
  [0, 0],
  [0, -1.08],
  [-1.1, 0],
  [-1.1, -1.08],
  [0, -2],
  [-1.1, -2],
  [0, -2.92],
  [-1.1, -2.92],
  [0, -3.84],
  [-1.1, -3.84],
];

interface Slot {
  key: string;
  icon: SpriteName;
  angle: number;
  radius: number;
  visible: boolean;
  ready: boolean;
  count?: number;
  cooldown?: number;
  urgent?: boolean;
  active?: boolean;
  onFire: () => void;
}

function ActionButton({ slot, size, cx, cy }: { slot: Slot; size: number; cx: number; cy: number }) {
  const touch = size + TOUCH_PAD * 2;
  return (
    <TouchAction onFire={slot.onFire} disabled={!slot.ready} style={[styles.slot, { left: cx - touch / 2, top: cy - touch / 2, width: touch, height: touch }]}>
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            margin: TOUCH_PAD,
            backgroundColor: slot.active ? COLORS.gold : slot.urgent ? COLORS.coral : slot.ready ? 'rgba(14, 74, 140, 0.82)' : 'rgba(4, 27, 61, 0.6)',
            borderColor: slot.active ? COLORS.white : slot.urgent ? COLORS.navy : slot.ready ? 'rgba(99, 201, 255, 0.85)' : 'rgba(99, 201, 255, 0.3)',
            opacity: slot.ready ? 1 : 0.75,
          },
        ]}
      >
        <Icon name={slot.icon} size={size * 0.6} />
        {slot.cooldown !== undefined && slot.cooldown > 0 && (
          <View style={[styles.cooldown, { borderRadius: size / 2 }]}>
            <Text style={styles.cooldownText}>{Math.ceil(slot.cooldown)}</Text>
          </View>
        )}
      </View>
      {slot.count !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{slot.count}</Text>
        </View>
      )}
    </TouchAction>
  );
}

export const actionsScale = (width: number, height: number) => Math.max(0.78, Math.min(1, Math.min(width, height) / 400));

export const actionsWidth = (width: number, height: number) => (height > width ? (MAIN + TOUCH_PAD * 2 + STEP * 1.1) * actionsScale(width, height) : BOX * actionsScale(width, height));

export function DiveActions({ state, right, bottom, onSonar, onBalloon, onRepellent, onMedkit, onScooter, onHarpoon, onCamera, onShutter, onPip, onKit, onKitCycle }: Props) {
  const { width, height } = useWindowDimensions();
  const scale = actionsScale(width, height);
  const { diver, stats } = state;
  const hurt = diver.health < MAX_HEALTH;
  const kitId = selectedKit(state);
  const kitKinds = availableKit(state).length;
  const shooting = state.photoMode > 0;
  const slots: Slot[] = [
    { key: 'scooter', icon: 'icon_scooter', angle: 180, radius: INNER, visible: stats.scooter > 0, ready: state.boostCooldown <= 0, cooldown: state.boostCooldown, onFire: onScooter },
    { key: 'harpoon', icon: 'icon_harpoon', angle: 150, radius: INNER, visible: diver.harpoons > 0, ready: state.harpoonCooldown <= 0, active: !!state.harpoonAim, count: diver.harpoons, onFire: onHarpoon },
    { key: 'repellent', icon: 'icon_repellent', angle: 120, radius: INNER, visible: diver.repellents > 0, ready: state.repelTime <= 0, count: diver.repellents, onFire: onRepellent },
    { key: 'medkit', icon: 'icon_medkit', angle: 90, radius: INNER, visible: diver.medkits > 0 && hurt, ready: true, count: diver.medkits, urgent: diver.health < 40, onFire: onMedkit },
    { key: 'camera', icon: 'icon_camera', angle: 165, radius: OUTER, visible: stats.camera > 0, ready: true, active: shooting, onFire: onCamera },
    { key: 'balloon', icon: 'balloon', angle: 115, radius: OUTER, visible: diver.balloons > 0 && diver.carried.length > 0, ready: true, count: diver.balloons, onFire: onBalloon },
    { key: 'pip', icon: 'icon_pip', angle: 140, radius: OUTER, visible: stats.drone > 0, ready: state.drone.mode !== 'off' && (state.drone.mode !== 'dock' || state.drone.cooldown <= 0), active: state.drone.mode === 'out' || state.drone.mode === 'scout' || state.drone.mode === 'return', cooldown: state.drone.mode === 'dock' ? state.drone.cooldown : 0, onFire: onPip },
    { key: 'kit', icon: kitId ? KIT[kitId].icon : 'icon_workshop', angle: 90, radius: OUTER, visible: !!kitId, ready: true, count: kitId ? diver.kit[kitId] : 0, onFire: onKit },
  ];
  const portrait = height > width;
  const sonarShown = shooting || stats.sonarRange > 0;
  const box = BOX * scale;
  const cx = box - (MAIN / 2 + TOUCH_PAD) * scale;
  const cy = cx;
  const grid = new Map(slots.filter((slot) => slot.visible).map((slot, i) => [slot.key, GRID[i + (sonarShown ? 1 : 0)]]));
  const sonar: Slot = shooting
    ? { key: 'shutter', icon: 'icon_camera', angle: 0, radius: 0, visible: true, ready: state.photoCooldown <= 0, active: true, onFire: onShutter }
    : { key: 'sonar', icon: 'icon_sonar', angle: 0, radius: 0, visible: stats.sonarRange > 0, ready: state.sonarCooldown <= 0, cooldown: state.sonarCooldown, onFire: onSonar };
  const shown = slots.filter((slot) => slot.visible);
  const outer = shown.some((slot) => slot.radius === OUTER);
  const plate = ((outer ? OUTER : INNER) + SMALL / 2 + 14) * scale;
  const core = (portrait ? MAIN / 2 + 8 : INNER - SMALL / 2 - 6) * scale;

  return (
    <View style={[styles.root, { right, bottom, width: box, height: box }]} pointerEvents="box-none">
      {shown.length > 0 && !portrait && <View pointerEvents="none" style={[styles.plate, { left: cx - plate, top: cy - plate, width: plate * 2, height: plate * 2, borderRadius: plate }]} />}
      {(portrait ? sonar.visible : shown.length > 0 || sonar.visible) && <View pointerEvents="none" style={[styles.core, { left: cx - core, top: cy - core, width: core * 2, height: core * 2, borderRadius: core }]} />}
      {shooting && <Text pointerEvents="none" style={[styles.hint, { left: cx - 60 * scale, top: cy - (MAIN / 2 + 30) * scale, width: 120 * scale }]}>Fotoaparát</Text>}
      {slots.map((slot) => {
        if (!slot.visible) return null;
        const a = (slot.angle * Math.PI) / 180;
        const cell = grid.get(slot.key);
        const [dx, dy] = portrait && cell ? [cell[0] * STEP, cell[1] * STEP] : [Math.cos(a) * slot.radius, -Math.sin(a) * slot.radius];
        const button = <ActionButton key={slot.key} slot={slot} size={SMALL * scale} cx={cx + dx * scale} cy={cy + dy * scale} />;
        if (slot.key !== 'kit' || kitKinds < 2) return button;
        const cycle: Slot = { key: 'cycle', icon: 'icon_workshop', angle: 0, radius: 0, visible: true, ready: true, onFire: onKitCycle };
        return [button, <ActionButton key="cycle" slot={cycle} size={SMALL * 0.55 * scale} cx={cx + dx * scale - SMALL * 0.62 * scale} cy={cy + dy * scale - SMALL * 0.5 * scale} />];
      })}
      {sonar.visible && <ActionButton slot={sonar} size={MAIN * scale} cx={cx} cy={cy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute' },
  slot: { position: 'absolute' },
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  plate: { position: 'absolute', backgroundColor: 'rgba(4, 27, 61, 0.28)', borderWidth: 1.5, borderColor: 'rgba(99, 201, 255, 0.22)' },
  core: { position: 'absolute', backgroundColor: 'rgba(4, 27, 61, 0.3)', borderWidth: 1.5, borderColor: 'rgba(99, 201, 255, 0.28)' },
  hint: { position: 'absolute', textAlign: 'center', color: COLORS.gold, fontFamily: FONTS.title, fontSize: 13, ...textShadow },
  cooldown: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4, 27, 61, 0.6)', alignItems: 'center', justifyContent: 'center' },
  cooldownText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 18, ...textShadow },
  badge: { position: 'absolute', right: 2, top: 2, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: COLORS.gold, borderWidth: 2, borderColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.navy, fontFamily: FONTS.title, fontSize: 12, lineHeight: 15 },
});
