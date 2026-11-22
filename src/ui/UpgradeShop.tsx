import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { REGIONS } from '../game/regions';
import { UPGRADES, upgradeCost, type UpgradeId, type UpgradeLevels } from '../progression/upgrades';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { MoneyPill, Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  money: number;
  levels: UpgradeLevels;
  onBuy: (id: UpgradeId) => void;
  onClose: () => void;
  width: number;
  height: number;
}

export function UpgradeShop({ money, levels, onBuy, onClose, width, height }: Props) {
  const columns = width > 900 ? 4 : width > 560 ? 2 : 1;
  const cardWidth = Math.min(220, (Math.min(width - 60, 960) - (columns - 1) * 10) / columns);
  return (
    <Overlay dim={0.65}>
      <Panel style={[styles.panel, { maxHeight: height - 24, maxWidth: Math.min(width - 24, 980) }]}>
        <View style={styles.header}>
          <Title size={28}>Vylepšení</Title>
          <MoneyPill amount={money} />
        </View>
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {UPGRADES.map((def) => {
            const level = levels[def.id];
            const maxed = level >= def.max;
            const cost = upgradeCost(def, level);
            const affordable = money >= cost;
            return (
              <View key={def.id} style={[styles.card, { width: cardWidth }]}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Icon name={def.icon} size={44} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{def.name}</Text>
                    <Text style={styles.desc}>{def.description}</Text>
                  </View>
                </View>
                <View style={styles.levels}>
                  {Array.from({ length: def.max }, (_, i) => (
                    <View key={i} style={[styles.pip, i < level && styles.pipOn]} />
                  ))}
                </View>
                <Text style={styles.effect}>
                  {def.effect(level)}
                  {!maxed ? `  →  ${def.effect(level + 1)}` : ''}
                </Text>
                {def.id === 'boat' && !maxed && <Text style={styles.unlock}>Odemkne: {REGIONS[level + 1].name}</Text>}
                <GameButton
                  label={maxed ? 'MAX' : `${cost.toLocaleString('cs-CZ')} $`}
                  variant={maxed ? 'navy' : affordable ? 'green' : 'navy'}
                  size="sm"
                  disabled={maxed || !affordable}
                  silent
                  onPress={() => onBuy(def.id)}
                />
              </View>
            );
          })}
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} style={styles.back} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', alignItems: 'stretch', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 4 },
  card: { backgroundColor: COLORS.panelLight, borderRadius: 14, padding: 10, gap: 6, borderWidth: 2, borderColor: '#2A7BD6' },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(2, 16, 40, 0.5)', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 15 },
  desc: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 11 },
  levels: { flexDirection: 'row', gap: 4 },
  pip: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(2, 16, 40, 0.6)' },
  pipOn: { backgroundColor: COLORS.gold },
  effect: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 11 },
  unlock: { color: COLORS.aqua, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  back: { alignSelf: 'center' },
});
