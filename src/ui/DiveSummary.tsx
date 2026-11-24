import { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHESTS, SHARKS } from '../game/catalog';
import { MATERIALS, type MaterialId } from '../game/gear';
import { FACTION_IDS, FACTIONS, SHARD_REWARDS, type FactionId } from '../progression/factions';
import { CHALLENGES, CONDITIONS } from '../game/modifiers';
import { RELICS } from '../progression/relics';
import { OCEANS } from '../game/oceans';
import { speciesById } from '../progression/encyclopedia';
import { CHARACTERS } from '../progression/characters';
import { radioLine } from '../progression/dialogue';
import { SpeakerLine } from './Dialogue';
import { pearlLabel } from '../progression/story';
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
  eel: 'Kousla tě muréna.',
  debris: 'Zasáhly tě trosky vraku.',
  crab: 'Štípl tě krab.',
  mega: 'Dostal tě obří predátor!',
  pressure: 'Tlak hlubin byl na tvůj oblek příliš silný.',
  cold: 'Podchladil ses v ledové vodě.',
  heat: 'Přehřál ses u lávových průduchů.',
  guardian: 'Strážce Atlantidy tě nepustil dál.',
  angler: 'Kousl tě ďas.',
  ray: 'Zasáhl tě výboj elektrického rejnoka.',
  toxic: 'Otrávil tě toxický mrak.',
  spikes: 'Napíchl ses na ostnatou past.',
  barracuda: 'Prolétlo tebou hejno barakud.',
  siphon: 'Popálila tě řetězová medúza.',
  pistol: 'Omráčila tě rázová vlna krevetky pistolníka.',
  shadow: 'Dostal tě trhlinový stín.',
  collapse: 'Zavalila tě hroutící se jeskyně.',
};

interface Props {
  summary: ResultSummary;
  onContinue: () => void;
  onShop: () => void;
  maxHeight: number;
  pendingShards: number;
  onHandOver: (faction: FactionId) => void;
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

export function DiveSummary({ summary, onContinue, onShop, maxHeight, pendingShards, onHandOver }: Props) {
  const { result, missions, missionReward } = summary;
  const endless = result.mode === 'endless';
  const paid = result.success || endless;
  const total = useCountUp(result.total + missionReward + summary.questReward + summary.levelReward);
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
            <View style={[styles.banner, { backgroundColor: endless ? COLORS.aqua : result.success ? COLORS.gold : COLORS.coral }]}>
              <Text style={[styles.bannerText, { color: result.success || endless ? COLORS.navy : COLORS.white }]}>
                {endless ? `PROPAST – ${result.maxDepthM} m` : result.success ? 'PONOR ÚSPĚŠNÝ!' : 'PONOR NEÚSPĚŠNÝ'}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Icon name={paid ? 'chest_open' : 'diver_hurt'} size={maxHeight < 560 ? 64 : paid ? 110 : 96} />
            </Animated.View>
            {endless ? (
              <>
                <Title color={COLORS.gold} size={40}>
                  +{total.toLocaleString('cs-CZ')} $
                </Title>
                {summary.shaftRecord && <Text style={styles.boss}>Nový rekord!</Text>}
                {!result.success && <Text style={styles.reason}>{REASONS[result.reason ?? 'oxygen']}</Text>}
              </>
            ) : result.success ? (
              <>
                <Title color={COLORS.gold} size={40}>
                  +{total.toLocaleString('cs-CZ')} $
                </Title>
                {result.bossLoot && <Text style={styles.boss}>Poklad bosse je tvůj: {SHARKS[OCEANS[result.ocean].boss].name}!</Text>}
                <Text style={styles.sub}>Poklad bezpečně doručen</Text>
              </>
            ) : (
              <>
                <Text style={styles.reason}>{REASONS[result.reason ?? 'oxygen']}</Text>
                <Text style={styles.sub}>Záchranáři tě vytáhli na loď. Peníze ani vylepšení neztrácíš.</Text>
              </>
            )}
            <SpeakerLine line={radioLine(paid ? 'success' : 'fail', result.duration * 7) ?? { who: 'maya', text: '' }} compact />
            {summary.quests.map((q) => (
              <View key={q.id} style={styles.story}>
                <Icon name={CHARACTERS[q.giver].portrait} size={44} />
                <View style={styles.relicInfo}>
                  <Text style={styles.storyTitle}>{q.chapterEnd ? `Kapitola dokončena: ${q.title}` : `Splněno: ${q.title}`}</Text>
                  <Text style={styles.storyText}>
                    +{q.reward.money.toLocaleString('cs-CZ')} $ • +{q.reward.research} dat{q.reward.pearls > 0 ? ` • +${pearlLabel(q.reward.pearls)}` : ''}
                    {q.reward.upgrade ? ` • ${q.reward.upgrade.label}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {summary.unlocked.length > 0 && <Text style={styles.boss}>Nový oceán na mapě: {summary.unlocked.map((o) => OCEANS[o].czech).join(', ')}</Text>}
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>+{summary.xp} XP</Text>
              {summary.research > 0 && <Text style={styles.progressText}>+{summary.research} výzkumných dat</Text>}
              {summary.photos.length > 0 && <Text style={styles.progressText}>Katalog: {summary.photos.map((id) => speciesById(id)?.name ?? id).join(', ')}</Text>}
            </View>
            {(Object.keys(summary.materials).length > 0 || Object.keys(summary.materialsLost).length > 0) && (
              <View style={styles.matBox}>
                <Text style={styles.progressText}>Materiály:</Text>
                {(Object.entries(summary.materials) as [MaterialId, number][]).map(([id, n]) => (
                  <View key={id} style={styles.mat}>
                    <Icon name={MATERIALS[id].sprite} size={22} />
                    <Text style={styles.matText}>+{n}</Text>
                  </View>
                ))}
                {Object.keys(summary.materialsLost).length > 0 && <Text style={styles.lost}>polovina ztracena při nezdaru</Text>}
              </View>
            )}
            {summary.contracts.map((c) => (
              <Text key={c} style={styles.contract}>Zakázka splněna: {c}</Text>
            ))}
            {summary.safari && <Text style={styles.boss}>Fotosafari týdne splněno!</Text>}
            {summary.weekly && <Text style={styles.boss}>Týdenní expedice: +3 perly</Text>}
            {summary.hunt && <Text style={styles.boss}>Poklad z mapy nalezen! Bratrstvo je nadšené.</Text>}
            {pendingShards > 0 && (
              <View style={styles.shardCard}>
                <View style={styles.shardHead}>
                  <Icon name="atlantean_shard" size={34} />
                  <Text style={styles.storyTitle}>Atlantský úlomek ×{pendingShards}: komu ho předáš?</Text>
                </View>
                <View style={styles.shardButtons}>
                  {FACTION_IDS.map((f) => (
                    <GameButton key={f} label={FACTIONS[f].name.split(' ')[0]} size="xs" variant="navy" icon={<Icon name={FACTIONS[f].icon} size={18} />} onPress={() => onHandOver(f)} />
                  ))}
                </View>
                <Text style={styles.storyText}>{FACTION_IDS.map((f) => SHARD_REWARDS[f].text).join(' • ')}</Text>
              </View>
            )}
            {summary.levelUps.length > 0 && <Text style={styles.boss}>Úroveň průzkumníka {summary.levelUps[summary.levelUps.length - 1]}! +{summary.levelReward.toLocaleString('cs-CZ')} $</Text>}
            <View style={styles.table}>
              {endless ? (
                <>
                  <Row label="Hloubka" value={`${result.maxDepthM} m`} color={COLORS.aqua} />
                  <Row label="Sebrané mince" value={`${result.coins} $`} color={COLORS.gold} />
                  <Row label="Bonus za hloubku" value={`+${result.depthBonus} $`} color={COLORS.seaweed} />
                  {summary.shaftPearls > 0 && <Row label="Perly za rekord" value={`+${summary.shaftPearls}`} color="#F7C6E0" />}
                  <Row label="Zásahy" value={String(result.hits)} />
                </>
              ) : result.success ? (
                <>
                  <Row label="Získané truhlice" value={String(result.chests.length)} />
                  {result.banked.length > 0 && <Row label="Z toho balónem" value={String(result.banked.length)} color={COLORS.orange} />}
                  <Row label="Hodnota truhlic" value={`${result.chestValue} $`} color={COLORS.gold} />
                  {result.greedBonus > 0 && <Row label={`Násobič ×${result.multiplier.toLocaleString('cs-CZ')}`} value={`+${result.greedBonus} $`} color={COLORS.seaweed} />}
                  {result.conditionBonus > 0 && <Row label={CONDITIONS[result.condition].name} value={`+${result.conditionBonus} $`} color={COLORS.seaweed} />}
                  {result.relicBonus > 0 && <Row label="Bonus relikvií" value={`+${result.relicBonus} $`} color={COLORS.seaweed} />}
                  {result.rescueBonus > 0 && <Row label="Odměna za záchranu" value={`+${result.rescueBonus} $`} color={COLORS.seaweed} />}
                  {result.expeditionBonus > 0 && <Row label="Bonus výpravy" value={`+${result.expeditionBonus} $`} color={COLORS.seaweed} />}
                  <Row label="Sebrané mince" value={`${result.coins} $`} color={COLORS.gold} />
                  <Row label={`Bonus za hloubku (${result.maxDepthM} m)`} value={`+${result.depthBonus} $`} color={COLORS.seaweed} />
                  {result.noHitBonus > 0 && <Row label="Bez zásahu" value={`+${result.noHitBonus} $`} color={COLORS.seaweed} />}
                  {result.challengeBonus > 0 && result.challenge && <Row label={`Výzva: ${CHALLENGES[result.challenge].name}`} value={`+${result.challengeBonus} $`} color={COLORS.gold} />}
                </>
              ) : (
                <>
                  <Row label="Ztracený poklad" value={result.lostValue > 0 ? `-${result.lostValue} $` : '0 $'} color={COLORS.coral} />
                  {result.insured > 0 && <Row label="Vyplaceno pojištění" value={`+${result.insured} $`} color={COLORS.aqua} />}
                  {result.banked.length > 0 && <Row label="Zachráněno balónem" value={`+${result.total - result.insured} $`} color={COLORS.orange} />}
                  <Row label="Maximální hloubka" value={`${result.maxDepthM} m`} />
                  <Row label="Zásahy" value={String(result.hits)} />
                </>
              )}
              {result.chests.length > 0 && result.success && !endless && (
                <View style={styles.chests}>
                  {result.chests.map((c) => (
                    <Icon key={c.id} name={CHESTS[c.kind].sprite} size={34} />
                  ))}
                </View>
              )}
            </View>
            {result.bankedLost > 0 && <Text style={styles.sub}>{result.bankedLost}× balón odplul moc daleko od lodi.</Text>}
            {summary.newRelics.length > 0 && (
              <View style={styles.relics}>
                <Text style={styles.relicTitle}>Nová relikvie!</Text>
                {summary.newRelics.map((id) => {
                  const relic = RELICS.find((r) => r.id === id)!;
                  return (
                    <View key={id} style={styles.relicRow}>
                      <Icon name={relic.sprite} size={40} />
                      <View style={styles.relicInfo}>
                        <Text style={styles.relicName}>{relic.name}</Text>
                        <Text style={styles.sub}>{relic.description}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            {missions.length > 0 && (
              <View style={styles.missions}>
                <Text style={styles.missionTitle}>Splněné mise</Text>
                {missions.map((m) => (
                  <Row key={m.id} label={`✓ ${m.title}`} value={`+${Math.round(m.reward * summary.missionScale)} $`} color={COLORS.gold} />
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
  matBox: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  matText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14 },
  lost: { color: COLORS.coral, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  contract: { color: COLORS.seaweed, fontFamily: FONTS.bodyHeavy, fontSize: 12, textAlign: 'center' },
  shardCard: { backgroundColor: 'rgba(16, 70, 132, 0.7)', borderRadius: 12, padding: 8, gap: 6, borderWidth: 2, borderColor: COLORS.aqua, alignSelf: 'stretch' },
  shardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shardButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  progressText: { color: COLORS.aqua, fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  story: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255, 191, 50, 0.15)', borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: COLORS.gold },
  storyTitle: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 15 },
  storyText: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12 },
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
  boss: { color: COLORS.coral, fontFamily: FONTS.title, fontSize: 18, ...textShadow },
  relics: { alignSelf: 'stretch', backgroundColor: 'rgba(173, 101, 245, 0.18)', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1.5, borderColor: COLORS.purple },
  relicTitle: { color: COLORS.purple, fontFamily: FONTS.title, fontSize: 16 },
  relicRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  relicInfo: { flex: 1 },
  relicName: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14 },
  missions: { alignSelf: 'stretch', backgroundColor: 'rgba(255, 191, 50, 0.12)', borderRadius: 12, padding: 10, gap: 4, borderWidth: 1.5, borderColor: COLORS.gold },
  missionTitle: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 10, justifyContent: 'center', padding: 12, paddingTop: 6 },
});
