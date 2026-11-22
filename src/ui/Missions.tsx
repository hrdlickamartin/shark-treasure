import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MISSIONS, activeMissions } from '../progression/missions';
import type { SaveData } from '../progression/save';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  save: SaveData;
  onClose: () => void;
  height: number;
}

export function Missions({ save, onClose, height }: Props) {
  const active = activeMissions(save.missionsDone);
  const done = MISSIONS.filter((m) => save.missionsDone.includes(m.id));
  const s = save.stats;
  return (
    <Overlay dim={0.65}>
      <Panel style={[styles.panel, { maxHeight: height - 24 }]}>
        <View style={styles.header}>
          <Icon name="icon_trophy" size={34} />
          <Title size={28}>Mise</Title>
        </View>
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {active.length === 0 && <Text style={styles.empty}>Všechny mise splněny! Jsi legenda oceánu.</Text>}
          {active.map((m) => {
            const progress = Math.min(m.target, save.missionProgress[m.id] ?? 0);
            return (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.title}>{m.title}</Text>
                  <Text style={styles.reward}>+{m.reward} $</Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.fill, { width: `${(progress / m.target) * 100}%` }]} />
                </View>
                <Text style={styles.progress}>
                  {progress.toLocaleString('cs-CZ')} / {m.target.toLocaleString('cs-CZ')}
                </Text>
              </View>
            );
          })}
          {done.length > 0 && <Text style={styles.section}>Splněno ({done.length}/{MISSIONS.length})</Text>}
          {done.map((m) => (
            <Text key={m.id} style={styles.done}>
              ✓ {m.title}
            </Text>
          ))}
          <Text style={styles.section}>Statistiky</Text>
          <Text style={styles.done}>
            Ponory: {s.dives} • Úspěšné: {s.successes} • Truhlice: {s.chests} • Rekord: {s.bestDepth} m • Celkem: {s.totalEarned.toLocaleString('cs-CZ')} $
          </Text>
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} style={styles.back} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 520, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  list: { gap: 8 },
  empty: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 16, textAlign: 'center' },
  card: { backgroundColor: COLORS.panelLight, borderRadius: 12, padding: 10, gap: 6, borderWidth: 2, borderColor: '#2A7BD6' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 14, flex: 1 },
  reward: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 15 },
  bar: { height: 10, borderRadius: 6, backgroundColor: 'rgba(2, 16, 40, 0.6)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.seaweed, borderRadius: 6 },
  progress: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 11 },
  section: { color: COLORS.aqua, fontFamily: FONTS.title, fontSize: 15, marginTop: 6 },
  done: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12 },
  back: { alignSelf: 'center' },
});
