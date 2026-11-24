import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { chestSlots, CHESTS } from '../game/catalog';
import { CHALLENGES, CONDITIONS } from '../game/modifiers';
import { greedMultiplier } from '../game/systems/dive';
import { MAX_HEALTH, PX_PER_M } from '../game/constants';
import { oceanOf } from '../game/oceans';
import { regionAt } from '../game/regions';
import { objectiveProps } from '../game/systems/props';
import { tideInfo, TIDE_WARNING } from '../game/systems/tide';
import { MATERIALS, type MaterialId } from '../game/gear';
import type { GameState, Prop } from '../game/types';
import type { SpriteName } from '../render/spriteAssets';
import { Icon } from '../render/Sprite';
import { MoneyPill } from './Panel';
import { TouchAction } from './TouchAction';
import { COLORS, FONTS, textShadow } from './theme';

interface Props {
  state: GameState;
  narrow: boolean;
  money: number;
  topInset: number;
  leftInset: number;
  rightInset: number;
  markers: boolean;
  onPause: () => void;
}

export function propIcon(prop: Prop): SpriteName {
  if (prop.kind === 'artifact') return prop.sprite ?? 'map_fragment';
  if (prop.kind === 'survivor') return 'diver_hurt';
  if (prop.kind === 'lever') return 'lever';
  if (prop.kind === 'node') return 'energy_node';
  if (prop.kind === 'echo') return prop.sprite ?? 'icon_sonar';
  if (prop.kind === 'vault') return 'chest_legendary';
  if (prop.kind === 'shard') return 'atlantean_shard';
  if (prop.kind === 'heartstone') return 'heartstone';
  if (prop.kind === 'scan') return 'icon_pip';
  if (prop.kind === 'dig') return 'sand_mound';
  return 'map_fragment';
}

function nearestObjective(state: GameState): { d: number; a: number; icon: SpriteName; color: string } | null {
  const { diver } = state;
  let best: { d: number; a: number; icon: SpriteName; color: string } | null = null;
  for (const p of objectiveProps(state)) {
    const d = Math.hypot(p.x - diver.x, p.y - diver.y);
    if (best && best.d < d) continue;
    best = { d, a: (Math.atan2(p.y - diver.y, p.x - diver.x) * 180) / Math.PI, icon: propIcon(p), color: '#F7C6E0' };
  }
  for (const c of state.chests) {
    if (!c.id.startsWith('evt:')) continue;
    const d = Math.hypot(c.x - diver.x, c.y - diver.y);
    if (best && best.d < d) continue;
    best = { d, a: (Math.atan2(c.y - diver.y, c.x - diver.x) * 180) / Math.PI, icon: 'chest_mystery', color: COLORS.aqua };
  }
  return best;
}

function TideRow({ state, narrow }: { state: GameState; narrow: boolean }) {
  const tide = tideInfo(state);
  if (!tide.active || !state.expansion) return null;
  const warn = tide.strong && tide.remaining <= TIDE_WARNING;
  const pulse = warn ? 0.55 + Math.abs(Math.sin(state.time * 6)) * 0.45 : 1;
  const half = tide.period / 2;
  return (
    <View style={styles.stat}>
      <Icon name="icon_tide" size={24} />
      <View style={[styles.tideRing, { borderColor: warn ? COLORS.coral : tide.high ? COLORS.aqua : COLORS.sky, opacity: pulse }]}>
        <View style={[styles.tideArrow, { transform: [{ rotate: tide.sign > 0 ? '0deg' : '180deg' }] }]} />
      </View>
      <Bar value={tide.remaining / half} color={tide.high ? COLORS.aqua : COLORS.sky} width={narrow ? 56 : 84} blink={warn && Math.floor(state.time * 4) % 2 === 0} />
      <Text style={[styles.statText, warn && { color: COLORS.coral }]}>{tide.high ? 'Příliv' : 'Odliv'} {Math.ceil(tide.remaining)} s</Text>
    </View>
  );
}

function Bar({ value, color, width, blink }: { value: number; color: string; width: number; blink?: boolean }) {
  return (
    <View style={[styles.barOuter, { width }]}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, opacity: blink ? 0.45 : 1 }]} />
      <View style={styles.barShine} />
    </View>
  );
}

export function HUD({ state, narrow, money, topInset, leftInset, rightInset, markers, onPause }: Props) {
  const { diver, stats, time, boat } = state;
  const diving = state.phase === 'dive';
  const oxygenPct = diver.oxygen / stats.oxygenMax;
  const low = oxygenPct < 0.25;
  const blink = low && Math.floor(time * 4) % 2 === 0;
  const depth = Math.max(0, Math.round(diver.y / PX_PER_M));
  const region = regionAt(oceanOf(state).regions, diving ? diver.x : boat.x);
  const carriedValue = diver.carried.reduce((s, c) => s + c.value, 0) + diver.coins;
  const multiplier = greedMultiplier(diver.carried.length + state.balloons.filter((b) => b.surfaced).length);
  const dx = boat.x - diver.x;
  const dy = -diver.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const distance = Math.round(Math.hypot(dx, dy) / PX_PER_M);
  const nearest = diving && stats.sonarRange > 0
    ? state.chests.reduce<{ d: number; a: number } | null>((best, c) => {
        const d = Math.hypot(c.x - diver.x, c.y - diver.y);
        if (d > stats.sonarRange || (best && best.d < d)) return best;
        return { d, a: (Math.atan2(c.y - diver.y, c.x - diver.x) * 180) / Math.PI };
      }, null)
    : null;

  const objective = diving && markers ? nearestObjective(state) : null;
  const target = objective ?? (nearest ? { ...nearest, icon: 'chest_common' as SpriteName, color: COLORS.gold } : null);
  const ocean = oceanOf(state);
  const pressure = diving && state.mode === 'sea' ? depth - stats.safeDepth : -999;
  const cargoProps = diver.cargo.map((id) => state.props.find((p) => p.id === id)).filter((p): p is Prop => !!p);

  const centerBlock = (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.depthPill}>
            <Text style={styles.depthText}>{diving ? `Hloubka: ${depth} m` : state.mode === 'endless' ? 'Hlubinný ponor' : region.name}</Text>
          </View>
          {diving ? (
            <View style={styles.compass}>
              <View style={[styles.arrowWrap, { transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={styles.arrow} />
              </View>
              <Icon name="boat" size={26} />
              <Text style={styles.compassText}>{distance} m</Text>
              {target && (
                <>
                  <View style={[styles.arrowWrap, { transform: [{ rotate: `${target.a}deg` }] }]}>
                    <View style={[styles.arrow, { borderLeftColor: target.color }]} />
                  </View>
                  <Icon name={target.icon} size={22} />
                  <Text style={styles.compassText}>{Math.round(target.d / PX_PER_M)} m</Text>
                </>
              )}
            </View>
          ) : (
            <Text style={styles.regionSub}>{state.mode === 'endless' ? `Rekord ${state.shaftBest} m` : region.subtitle}</Text>
          )}
          {diving && state.mode === 'sea' && <Minimap state={state} />}
          {diving && state.mode === 'endless' && <Text style={styles.regionSub}>Rekord {Math.max(state.shaftBest, Math.floor(state.record.maxDepth / PX_PER_M))} m</Text>}
          {(state.condition !== 'normal' || state.challenge) && (
            <View style={styles.chips}>
              {state.condition !== 'normal' && (
                <View style={[styles.chip, { borderColor: COLORS.purple }]}>
                  <Text style={styles.chipText}>{CONDITIONS[state.condition].name}</Text>
                </View>
              )}
              {state.challenge && (
                <View style={[styles.chip, { borderColor: COLORS.gold }]}>
                  <Text style={styles.chipText}>Výzva: {CHALLENGES[state.challenge].name}</Text>
                </View>
              )}
            </View>
          )}
          {pressure > -15 && (
            <View style={[styles.chip, { borderColor: pressure > 0 ? COLORS.coral : COLORS.orange }]}>
              <Text style={styles.chipText}>{pressure > 0 ? `TLAK! Bezpečně jen do ${stats.safeDepth} m` : `Blížíš se limitu ${stats.safeDepth} m`}</Text>
            </View>
          )}
          {diving && (diver.breathing || diver.inAir || diver.atSub) && (
            <View style={[styles.chip, { borderColor: COLORS.aqua }]}>
              <Text style={styles.chipText}>{diver.atSub ? 'Ponorka – doplňuješ kyslík' : diver.inAir ? 'Vzduchová kapsa – doplňuješ kyslík' : 'Dýcháš u hladiny'}</Text>
            </View>
          )}
        </View>
  );

  return (
    <View style={[styles.root, { paddingTop: topInset + 8, paddingLeft: leftInset + 12, paddingRight: rightInset + 12 }]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.left}>
          <View style={styles.stat}>
            <Icon name="icon_heart" size={24} />
            <Bar value={diver.health / MAX_HEALTH} color={COLORS.coral} width={narrow ? 70 : 96} />
            <Text style={styles.statText}>{Math.ceil(diver.health)}</Text>
          </View>
          <View style={styles.stat}>
            <Icon name="icon_o2" size={24} />
            <Bar value={oxygenPct} color={low ? '#FF4D67' : COLORS.aqua} width={narrow ? 90 : 130} blink={blink} />
            <Text style={[styles.statText, low && { color: COLORS.coral }]}>{Math.round(oxygenPct * 100)} %</Text>
          </View>
          <TideRow state={state} narrow={narrow} />
          {ocean.temperature && state.mode === 'sea' && diving && (
            <View style={styles.stat}>
              <Icon name="icon_thermal" size={24} />
              <Bar value={diver.temp / 100} color={ocean.temperature === 'cold' ? '#8FD8FF' : COLORS.orange} width={narrow ? 90 : 130} blink={diver.temp < 25 && Math.floor(time * 4) % 2 === 0} />
              <Text style={[styles.statText, diver.temp < 25 && { color: COLORS.coral }]}>{Math.round(diver.temp)} %</Text>
            </View>
          )}
        </View>

        {!narrow && centerBlock}
        <View style={styles.right}>
          <MoneyPill amount={money} />
          <TouchAction onFire={onPause}>
            <View style={styles.pause}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          </TouchAction>
        </View>
      </View>

      {narrow && <View style={styles.narrowCenter} pointerEvents="none">{centerBlock}</View>}
      {diving && (diver.carried.length > 0 || diver.coins > 0 || cargoProps.length > 0 || Object.keys(state.record.materials).length > 0) && (
        <View style={[styles.carried, { opacity: 0.75 + Math.sin(time * 5) * 0.25 }]} pointerEvents="none">
          {state.mode === 'sea' && <View style={styles.chestRow}>
            {diver.carried.map((c, i) => (
              <View key={c.id + i} style={[styles.slot, { borderColor: c.kind === 'heavy' ? COLORS.orange : COLORS.gold, width: chestSlots(c.kind) * 32 + (chestSlots(c.kind) - 1) * 4 }]}>
                <Icon name={CHESTS[c.kind].sprite} size={26} />
              </View>
            ))}
            {Array.from({ length: Math.max(0, stats.capacity - diver.carried.reduce((sum, c) => sum + chestSlots(c.kind), 0)) }, (_, i) => (
              <View key={`e${i}`} style={styles.slot} />
            ))}
            {cargoProps.map((p) => (
              <View key={p.id} style={[styles.slot, { borderColor: '#F7C6E0' }]}>
                <Icon name={propIcon(p)} size={26} />
              </View>
            ))}
          </View>}
          <Text style={styles.carriedText}>+{carriedValue} $ {state.mode === 'endless' ? 'sebráno' : 'nedoručeno'}</Text>
          {Object.keys(state.record.materials).length > 0 && (
            <View style={styles.matRow}>
              {(Object.entries(state.record.materials) as [MaterialId, number][]).map(([id, n]) => (
                <View key={id} style={styles.mat}>
                  <Icon name={MATERIALS[id].sprite} size={18} />
                  <Text style={styles.matText}>{n}</Text>
                </View>
              ))}
            </View>
          )}
          {multiplier > 1 && <Text style={styles.multiText}>×{multiplier.toLocaleString('cs-CZ')} při doručení</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { gap: 6, backgroundColor: 'rgba(8, 43, 89, 0.7)', borderRadius: 14, padding: 7, borderWidth: 2, borderColor: 'rgba(42, 123, 214, 0.8)' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14, minWidth: 40, ...textShadow },
  barOuter: { height: 14, borderRadius: 8, backgroundColor: 'rgba(2, 16, 40, 0.75)', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.navy },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6 },
  barShine: { position: 'absolute', left: 3, right: 3, top: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  center: { alignItems: 'center', gap: 4, flex: 1 },
  narrowCenter: { marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  depthPill: { backgroundColor: 'rgba(8, 43, 89, 0.8)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 2, borderColor: 'rgba(42, 123, 214, 0.8)' },
  depthText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 17, ...textShadow },
  regionSub: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, ...textShadow },
  compass: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(8, 43, 89, 0.65)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  compassText: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 12, marginRight: 4 },
  arrowWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  arrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.seaweed,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pause: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E8CE8',
    borderWidth: 2.5,
    borderColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pauseBar: { width: 5, height: 16, borderRadius: 2, backgroundColor: COLORS.white },
  carried: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(8, 43, 89, 0.75)', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: COLORS.gold },
  chestRow: { flexDirection: 'row', gap: 4 },
  slot: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  multiText: { color: COLORS.seaweed, fontFamily: FONTS.title, fontSize: 13, ...textShadow },
  chips: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: 'rgba(8, 43, 89, 0.8)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1.5 },
  chipText: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  minimap: { width: 180, height: 16, borderRadius: 8, backgroundColor: 'rgba(8, 43, 89, 0.75)', borderWidth: 1.5, borderColor: 'rgba(42, 123, 214, 0.9)', overflow: 'hidden' },
  miniDot: { position: 'absolute', top: 4, width: 6, height: 6, borderRadius: 3 },
  miniCave: { position: 'absolute', top: 2, height: 10, borderRadius: 3, backgroundColor: 'rgba(160, 175, 200, 0.6)' },
  tideRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  tideArrow: { width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 9, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: COLORS.white },
  matRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  mat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  matText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 12, ...textShadow },
  carriedText: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 13, marginTop: 3, ...textShadow },
});

export const ThrottledHUD = memo(
  function ThrottledHUD({ tick, ...props }: Props & { tick: number }) {
    return <HUD {...props} />;
  },
  (a, b) => a.tick === b.tick && a.money === b.money && a.narrow === b.narrow && a.topInset === b.topInset && a.leftInset === b.leftInset,
);

const MINI_RANGE = 2600;

function Minimap({ state }: { state: GameState }) {
  const center = state.boat.x;
  const width = 180;
  const toX = (x: number) => ((x - center) / MINI_RANGE / 2 + 0.5) * width;
  const inRange = (x: number) => Math.abs(x - center) < MINI_RANGE;
  const caves = [...state.chunks.values()].filter((c) => c.cave && inRange(c.x0 + 240));
  return (
    <View style={styles.minimap}>
      {caves.map((c) => (
        <View key={c.index} style={[styles.miniCave, { left: toX(c.cave!.x0), width: Math.max(4, (480 / MINI_RANGE / 2) * width) }]} />
      ))}
      {state.chests
        .filter((c) => state.seenChests.includes(c.id) && inRange(c.x))
        .map((c) => (
          <View key={c.id} style={[styles.miniDot, { left: toX(c.x) - 3, backgroundColor: c.boss ? COLORS.coral : COLORS.gold }]} />
        ))}
      {state.balloons.filter((b) => inRange(b.x)).map((b) => (
        <View key={b.id} style={[styles.miniDot, { left: toX(b.x) - 3, backgroundColor: COLORS.orange }]} />
      ))}
      <View style={[styles.miniDot, { left: width / 2 - 4, width: 8, height: 8, top: 3, backgroundColor: COLORS.white }]} />
      {inRange(state.diver.x) && <View style={[styles.miniDot, { left: toX(state.diver.x) - 4, width: 8, height: 8, top: 3, backgroundColor: COLORS.aqua }]} />}
    </View>
  );
}
