import { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHESTS } from '../game/catalog';
import type { DamageSource } from '../game/types';
import type { ResultSummary } from '../progression/useProgress';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS, textShadow } from './theme';

const REASONS: Record<DamageSource, string> = {
  oxygen: 'Došel ti kyslík.',
  shark: 'Napadl tě žralok.',
  mine: 'Narazil jsi na podvodní minu.',
  jelly: 'Popálila tě medúza.',
  urchin: 'Pobodal tě mořský ježek.',
};

interface Props {
  summary: ResultSummary;
  onContinue: () => void;
  onShop: () => void;
  maxHeight: number;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, duration]);
  return value;
}

function Row({ label, value, color = COLORS.white }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

export function DiveSummary({ summary, onContinue, onShop, maxHeight }: Props) {
  const { result, missions, missionReward } = summary;
  const total = useCountUp(result.total + missionReward);
  const [pop] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [pop, bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <Overlay>
      <Animated.View style={{ transform: [{ scale: pop }], maxHeight: maxHeight - 24, width: '100%', maxWidth: 460 }}>
        <Panel style={[styles.panel, { maxHeight: maxHeight - 24 }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.banner, { backgroundColor: result.success ? COLORS.gold : COLORS.coral }]}>
              <Text style={[styles.bannerText, { color: result.success ? COLORS.navy : COLORS.white }]}>
                {result.success ? 'PONOR ÚSPĚŠNÝ!' : 'PONOR NEÚSPĚŠNÝ'}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Icon name={result.success ? 'chest_open' : 'diver_hurt'} size={maxHeight < 560 ? 64 : result.success ? 110 : 96} />
            </Animated.View>
            {result.success ? (
              <>
                <Title color={COLORS.gold} size={40}>
                  +{total.toLocaleString('cs-CZ')} $
                </Title>
                <Text style={styles.sub}>Poklad bezpečně doručen</Text>
              </>
            ) : (
              <>
                <Text style={styles.reason}>{REASONS[result.reason ?? 'oxygen']}</Text>
                <Text style={styles.sub}>Záchranáři tě vytáhli na loď. Peníze ani vylepšení neztrácíš.</Text>
              </>
            )}
            <View style={styles.table}>
              {result.success ? (
                <>
                  <Row label="Získané truhlice" value={String(result.chests.length)} />
                  <Row label="Hodnota truhlic" value={`${result.chestValue} $`} color={COLORS.gold} />
                  <Row label="Sebrané mince" value={`${result.coins} $`} color={COLORS.gold} />
                  <Row label={`Bonus za hloubku (${result.maxDepthM} m)`} value={`+${result.depthBonus} $`} color={COLORS.seaweed} />
                  {result.noHitBonus > 0 && <Row label="Bez zásahu" value={`+${result.noHitBonus} $`} color={COLORS.seaweed} />}
                </>
              ) : (
                <>
                  <Row label="Ztracený poklad" value={result.lostValue > 0 ? `-${result.lostValue} $` : '0 $'} color={COLORS.coral} />
                  <Row label="Maximální hloubka" value={`${result.maxDepthM} m`} />
                  <Row label="Zásahy" value={String(result.hits)} />
                </>
              )}
              {result.chests.length > 0 && result.success && (
                <View style={styles.chests}>
                  {result.chests.map((c) => (
                    <Icon key={c.id} name={CHESTS[c.kind].sprite} size={34} />
                  ))}
                </View>
              )}
            </View>
            {missions.length > 0 && (
              <View style={styles.missions}>
                <Text style={styles.missionTitle}>Splněné mise</Text>
                {missions.map((m) => (
                  <Row key={m.id} label={`✓ ${m.title}`} value={`+${m.reward} $`} color={COLORS.gold} />
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.buttons}>
            <GameButton label={result.success ? 'Pokračovat' : 'Nový ponor'} onPress={onContinue} />
            <GameButton label="Vylepšení" variant="blue" onPress={onShop} />
          </View>
        </Panel>
      </Animated.View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 0, overflow: 'hidden', flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { alignItems: 'center', gap: 8, padding: 16, paddingBottom: 6 },
  banner: { paddingHorizontal: 22, paddingVertical: 6, borderRadius: 12, borderWidth: 2.5, borderColor: COLORS.navy, transform: [{ rotate: '-2deg' }] },
  bannerText: { fontFamily: FONTS.title, fontSize: 24, letterSpacing: 1 },
  sub: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 13, textAlign: 'center' },
  reason: { color: COLORS.coral, fontFamily: FONTS.title, fontSize: 22, ...textShadow },
  table: { alignSelf: 'stretch', backgroundColor: 'rgba(2, 16, 40, 0.45)', borderRadius: 12, padding: 10, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 14, flexShrink: 1 },
  rowValue: { fontFamily: FONTS.title, fontSize: 15 },
  chests: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 4 },
  missions: { alignSelf: 'stretch', backgroundColor: 'rgba(255, 191, 50, 0.12)', borderRadius: 12, padding: 10, gap: 4, borderWidth: 1.5, borderColor: COLORS.gold },
  missionTitle: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'center', padding: 12, paddingTop: 6 },
});
