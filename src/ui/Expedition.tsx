import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { canEmbark } from '../progression/embark';
import { expeditionScale, PERKS, pearlsFor, perkCost, perkLevel, type PerkId } from '../progression/expedition';
import type { SaveData } from '../progression/saveData';
import { UPGRADES, maxLevel } from '../progression/upgrades';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  save: SaveData;
  width: number;
  height: number;
  onBuyPerk: (id: PerkId) => void;
  onEmbark: () => void;
  onClose: () => void;
}

const BOAT = UPGRADES.find((u) => u.id === 'boat')!;

function Requirement({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.requirement}>
      <Text style={[styles.check, { color: done ? COLORS.seaweed : COLORS.coral }]}>{done ? '✓' : '✗'}</Text>
      <Text style={styles.reqText}>{label}</Text>
    </View>
  );
}

function PearlPill({ amount }: { amount: number }) {
  return (
    <View style={styles.pill}>
      <Icon name="icon_pearl" size={22} />
      <Text style={styles.pillText}>{amount}</Text>
    </View>
  );
}

export function Expedition({ save, width, height, onBuyPerk, onEmbark, onClose }: Props) {
  const [confirm, setConfirm] = useState(false);
  const current = expeditionScale(save.expedition);
  const next = expeditionScale(save.expedition + 1);
  const ready = canEmbark(save);
  const pearls = pearlsFor(save.run.earned, save.expedition);
  const columns = width > 820 ? 3 : width > 520 ? 2 : 1;
  const cardWidth = Math.min(240, (Math.min(width - 60, 860) - (columns - 1) * 10) / columns);

  return (
    <Overlay dim={0.65}>
      <Panel style={[styles.panel, { maxHeight: height - 24, maxWidth: Math.min(width - 24, 900) }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="icon_expedition" size={34} />
            <Title size={26}>{save.expedition + 1}. výprava</Title>
          </View>
          <PearlPill amount={save.pearls} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.note}>
            Nebezpečí ×{current.danger.toLocaleString('cs-CZ')} • žraloci ×{current.sharkSpeed.toLocaleString('cs-CZ')} • poklady +{Math.round(current.loot * 100)} % • mise ×
            {current.missions.toLocaleString('cs-CZ')}
          </Text>
          <View style={styles.box}>
            <Text style={styles.section}>Nová výprava</Text>
            <Requirement done={save.upgrades.boat >= maxLevel(BOAT, save.expedition)} label="Loď na nejvyšší úrovni" />
            <Requirement done={save.run.boss} label="Ukradni poklad některého z bossů (Megalodon, Leviatan, Tvor z hlubin)" />
            <Text style={styles.reqText}>
              Odměna: {pearls} perel • vybavení může o úroveň výš • poklady +{Math.round(next.loot * 100)} %, nebezpečí ×{next.danger.toLocaleString('cs-CZ')}
            </Text>
            {confirm && <Text style={styles.warn}>Přijdeš o peníze, vybavení a splněné mise. Relikvie, vzhledy, perly a deník ti zůstanou.</Text>}
            <GameButton
              label={!ready ? 'Ještě nejsi připraven' : confirm ? 'Opravdu vyplout' : 'Vyplout na novou výpravu'}
              variant={ready ? (confirm ? 'gold' : 'green') : 'navy'}
              size="sm"
              disabled={!ready}
              onPress={() => (confirm ? onEmbark() : setConfirm(true))}
              style={styles.center}
            />
          </View>
          <Text style={styles.section}>Perlový obchod – trvalé výhody</Text>
          <View style={styles.grid}>
            {PERKS.map((def) => {
              const level = perkLevel(save.perks, def.id);
              const cost = perkCost(def, level);
              const affordable = cost !== null && save.pearls >= cost;
              return (
                <View key={def.id} style={[styles.card, { width: cardWidth }]}>
                  <View style={styles.cardTop}>
                    <Icon name={def.icon} size={38} />
                    <View style={styles.info}>
                      <Text style={styles.name}>{def.name}</Text>
                      <Text style={styles.desc}>{def.description}</Text>
                    </View>
                  </View>
                  <View style={styles.levels}>
                    {def.costs.map((_, i) => (
                      <View key={i} style={[styles.pip, i < level && styles.pipOn]} />
                    ))}
                  </View>
                  <Text style={styles.effect}>
                    {def.effect(level)}
                    {cost !== null ? `  →  ${def.effect(level + 1)}` : ''}
                  </Text>
                  <GameButton
                    label={cost === null ? 'MAX' : `${cost} perel`}
                    variant={affordable ? 'green' : 'navy'}
                    size="sm"
                    disabled={!affordable}
                    silent
                    onPress={() => onBuyPerk(def.id)}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} style={styles.center} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', alignItems: 'stretch', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 10, paddingBottom: 4 },
  note: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12, textAlign: 'center' },
  box: { backgroundColor: 'rgba(2, 16, 40, 0.45)', borderRadius: 14, padding: 12, gap: 6, borderWidth: 2, borderColor: COLORS.gold },
  section: { color: COLORS.aqua, fontFamily: FONTS.title, fontSize: 16 },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { fontFamily: FONTS.title, fontSize: 16, width: 16 },
  reqText: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, flexShrink: 1 },
  warn: { color: COLORS.coral, fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  center: { alignSelf: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navyDark, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: '#F7C6E0' },
  pillText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: { backgroundColor: COLORS.panelLight, borderRadius: 14, padding: 10, gap: 6, borderWidth: 2, borderColor: '#2A7BD6' },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  info: { flex: 1 },
  name: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14 },
  desc: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 11 },
  levels: { flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(2, 16, 40, 0.6)' },
  pipOn: { backgroundColor: '#F7C6E0' },
  effect: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 11 },
});
