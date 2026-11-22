import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CHESTS } from '../game/catalog';
import { MAX_HEALTH, PX_PER_M } from '../game/constants';
import { regionAt } from '../game/regions';
import type { GameState } from '../game/types';
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
  onPause: () => void;
}

function Bar({ value, color, width, blink }: { value: number; color: string; width: number; blink?: boolean }) {
  return (
    <View style={[styles.barOuter, { width }]}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, opacity: blink ? 0.45 : 1 }]} />
      <View style={styles.barShine} />
    </View>
  );
}

export function HUD({ state, narrow, money, topInset, leftInset, rightInset, onPause }: Props) {
  const { diver, stats, time, boat } = state;
  const diving = state.phase === 'dive';
  const oxygenPct = diver.oxygen / stats.oxygenMax;
  const low = oxygenPct < 0.25;
  const blink = low && Math.floor(time * 4) % 2 === 0;
  const depth = Math.max(0, Math.round(diver.y / PX_PER_M));
  const region = regionAt(diving ? diver.x : boat.x);
  const carriedValue = diver.carried.reduce((s, c) => s + c.value, 0) + diver.coins;
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

  const centerBlock = (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.depthPill}>
            <Text style={styles.depthText}>{diving ? `Hloubka: ${depth} m` : region.name}</Text>
          </View>
          {diving ? (
            <View style={styles.compass}>
              <View style={[styles.arrowWrap, { transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={styles.arrow} />
              </View>
              <Icon name="boat" size={26} />
              <Text style={styles.compassText}>{distance} m</Text>
              {nearest && (
                <>
                  <View style={[styles.arrowWrap, { transform: [{ rotate: `${nearest.a}deg` }] }]}>
                    <View style={[styles.arrow, { borderLeftColor: COLORS.gold }]} />
                  </View>
                  <Icon name="chest_common" size={20} />
                  <Text style={styles.compassText}>{Math.round(nearest.d / PX_PER_M)} m</Text>
                </>
              )}
            </View>
          ) : (
            <Text style={styles.regionSub}>{region.subtitle}</Text>
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
      {diving && (diver.carried.length > 0 || diver.coins > 0) && (
        <View style={[styles.carried, { opacity: 0.75 + Math.sin(time * 5) * 0.25 }]} pointerEvents="none">
          <View style={styles.chestRow}>
            {Array.from({ length: stats.capacity }, (_, i) => {
              const c = diver.carried[i];
              return (
                <View key={i} style={[styles.slot, c && { borderColor: COLORS.gold }]}>
                  {c ? <Icon name={CHESTS[c.kind].sprite} size={26} /> : null}
                </View>
              );
            })}
          </View>
          <Text style={styles.carriedText}>+{carriedValue} $ nedoručeno</Text>
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
  carriedText: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 13, marginTop: 3, ...textShadow },
});

export const ThrottledHUD = memo(
  function ThrottledHUD({ tick, ...props }: Props & { tick: number }) {
    return <HUD {...props} />;
  },
  (a, b) => a.tick === b.tick && a.money === b.money && a.narrow === b.narrow && a.topInset === b.topInset && a.leftInset === b.leftInset,
);
