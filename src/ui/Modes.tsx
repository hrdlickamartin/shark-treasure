import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARKS } from '../game/catalog';
import { OCEANS, WORLD_OCEANS, weekIndex, type OceanId } from '../game/oceans';
import type { GameVariant } from '../game/types';
import { Icon } from '../render/Sprite';
import type { SpriteName } from '../render/spriteAssets';
import type { SaveData } from '../progression/saveData';
import { expansionOn, safariTarget, WEEKLY_PEARLS, weeklyOcean } from '../progression/tides';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS, textShadow } from './theme';

interface Props {
  save: SaveData;
  width: number;
  height: number;
  onStart: (variant: GameVariant, ocean?: OceanId) => void;
  onClose: () => void;
}

function Card({ icon, title, text, lock, children }: { icon: SpriteName; title: string; text: string; lock: string | null; children?: React.ReactNode }) {
  return (
    <View style={[styles.card, !!lock && styles.dim]}>
      <View style={styles.head}>
        <Icon name={icon} size={34} />
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{lock ?? text}</Text>
        </View>
      </View>
      {!lock && children}
    </View>
  );
}

export function Modes({ save, width, height, onStart, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const week = weekIndex();
  const on = expansionOn(save);
  const afterNine = on && save.tideChapter >= 10;
  const legendary = save.tideChapter >= 13;
  const weekly = save.weekly.week === week ? save.weekly : null;
  const safari = safariTarget(week);
  const bosses = WORLD_OCEANS.filter((id) => save.oceans.includes(id) && OCEANS[id].bossRegion !== null);
  const noExpansion = 'Odemkne se po dokončení hlavní kampaně.';
  return (
    <Overlay dim={0.7}>
      <Panel style={[styles.panel, { maxHeight: height - insets.top - insets.bottom - 16, width: Math.min(600, width - insets.left - insets.right - 16) }]}>
        <Title size={24}>Herní režimy</Title>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card icon="icon_camera" title="Volný průzkum" text="Ponor bez limitu kyslíku a bez truhel. Jen fotky, mapování a klid." lock={!on ? noExpansion : !afterNine ? 'Odemkne se po kapitole 9.' : null}>
            <GameButton label={`Vyplout: ${OCEANS[save.ocean].czech}`} size="sm" variant="green" onPress={() => onStart('free')} />
          </Card>
          <Card icon="icon_calendar" title="Týdenní expedice" text={`Stejný svět pro všechny tento týden: ${OCEANS[weeklyOcean(save, week)].czech}. První úspěch týdne: ${WEEKLY_PEARLS} perly.`} lock={!on ? noExpansion : !afterNine ? 'Odemkne se po kapitole 9.' : null}>
            <Text style={styles.text}>{weekly ? `Tvůj rekord týdne: ${weekly.best.toLocaleString('cs-CZ')} $ • ${weekly.depth} m${weekly.rewarded ? ' • perly získány' : ''}` : 'Tento týden zatím bez pokusu.'}</Text>
            <GameButton label="Vyrazit na expedici" size="sm" variant="gold" onPress={() => onStart('weekly')} />
          </Card>
          <Card icon="icon_trophy" title="Legendární expedice" text="Odvety s bossy: o polovinu víc života, dvojnásobný poklad, dvojnásobná trofej a legendární materiály." lock={!on ? noExpansion : !legendary ? 'Odemkne se po kapitole 12.' : null}>
            <View style={styles.wrap}>
              {bosses.map((id) => (
                <GameButton key={id} label={`${SHARKS[OCEANS[id].boss].name}`} size="xs" variant="navy" onPress={() => onStart('legendary', id)} />
              ))}
            </View>
          </Card>
          <Card icon="bottle_map" title="Lov pokladů" text={save.hunt.active ? save.hunt.active.clue : `Útržky mapy: ${save.hunt.pieces}/3. Láhve se vzkazem plují po moři, útržky prodává i Bratrstvo.`} lock={!on ? noExpansion : null} />
          <Card icon="icon_camera" title="Fotosafari týdne" text={`${safari.label}. ${save.safari.week === week && save.safari.done ? 'Splněno.' : 'Zachyť chování fotoaparátem.'}`} lock={!on ? noExpansion : null} />
        </ScrollView>
        <GameButton label="Zpět" variant="blue" size="sm" onPress={onClose} style={styles.center} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 8 },
  card: { backgroundColor: 'rgba(16, 70, 132, 0.55)', borderRadius: 12, padding: 9, gap: 7, borderWidth: 2, borderColor: 'rgba(42, 123, 214, 0.8)' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 16, ...textShadow },
  text: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dim: { opacity: 0.55 },
  center: { alignSelf: 'center' },
});
