import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OCEAN_ORDER, OCEANS, type OceanId } from '../game/oceans';
import { CHARACTERS } from '../progression/characters';
import { activeQuests, CATEGORY_LABEL, CHAPTER_COUNT } from '../progression/quests';
import type { SaveData } from '../progression/saveData';
import { Icon } from '../render/Sprite';
import { ILLUSTRATIONS } from '../render/spriteAssets';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS, textShadow } from './theme';
import { TouchAction } from './TouchAction';

interface Props {
  save: SaveData;
  width: number;
  height: number;
  onTravel: (ocean: OceanId) => void;
  onClose: () => void;
}

const MAP_ASPECT = 1.5;

function Gear({ label, have, need }: { label: string; have: number; need: number }) {
  if (need <= 0) return null;
  const ok = have >= need;
  return (
    <View style={[styles.gear, { borderColor: ok ? COLORS.seaweed : COLORS.coral }]}>
      <Text style={styles.gearText}>
        {ok ? '✓' : '!'} {label} {need}
      </Text>
    </View>
  );
}

export function WorldMap({ save, width, height, onTravel, onClose }: Props) {
  const [selected, setSelected] = useState<OceanId>(save.ocean);
  const landscape = width > height;
  const mapW = Math.min(landscape ? width * 0.58 : width - 32, (landscape ? height - 40 : height * 0.42) * MAP_ASPECT);
  const mapH = mapW / MAP_ASPECT;
  const ocean = OCEANS[selected];
  const open = save.oceans.includes(selected);
  const chapterIndex = OCEAN_ORDER.indexOf(selected);
  const quests = activeQuests(save.quests, save.oceans, save.flags).filter((q) => q.ocean === selected);
  const explored = ocean.regions.filter((r) => save.discoveries.includes(`loc:${selected}:${r.id}`)).length;
  const levels = save.upgrades;

  return (
    <Overlay dim={0.7}>
      <View style={[styles.root, { flexDirection: landscape ? 'row' : 'column' }]}>
        <View style={[styles.map, { width: mapW, height: mapH }]}>
          <Image source={ILLUSTRATIONS.world_map} style={{ width: mapW, height: mapH }} fadeDuration={0} />
          {OCEAN_ORDER.map((id) => {
            const def = OCEANS[id];
            const unlocked = save.oceans.includes(id);
            const active = id === selected;
            return (
              <TouchAction key={id} onFire={() => setSelected(id)} style={[styles.pin, { left: def.map.x * mapW - 22, top: def.map.y * mapH - 22 }]}>
                <View style={[styles.pinDot, { backgroundColor: unlocked ? (active ? COLORS.gold : COLORS.aqua) : 'rgba(4, 27, 61, 0.75)', borderColor: active ? COLORS.white : COLORS.navy }]}>
                  <Text style={styles.pinText}>{unlocked ? OCEAN_ORDER.indexOf(id) + 1 : '?'}</Text>
                </View>
                {id === save.ocean && <View style={styles.here} />}
              </TouchAction>
            );
          })}
        </View>
        <Panel style={[styles.panel, { maxHeight: landscape ? height - 24 : height - mapH - 40, width: landscape ? Math.min(360, width - mapW - 40) : mapW }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Title size={22}>{open ? ocean.czech : 'Neznámé vody'}</Title>
            <Text style={styles.sub}>{open ? `${ocean.name} • ${ocean.subtitle}` : `Odemkne se po kapitole ${chapterIndex} hlavního příběhu.`}</Text>
            {open && (
              <>
                <Text style={styles.mechanic}>{ocean.mechanic}</Text>
                <Text style={styles.label}>Doporučená výbava</Text>
                <View style={styles.gearRow}>
                  <Gear label="Tlakový oblek" have={levels.pressure} need={ocean.recommended.pressure} />
                  <Gear label="Termooblek" have={levels.thermal} need={ocean.recommended.thermal} />
                  <Gear label="Světlo" have={levels.light} need={ocean.recommended.light} />
                  <Gear label="Řezák" have={levels.cutter} need={ocean.recommended.cutter} />
                </View>
                <Text style={styles.label}>
                  Lokace {explored}/{ocean.regions.length}
                </Text>
                <Text style={styles.sub}>{ocean.regions.map((r) => (save.discoveries.includes(`loc:${selected}:${r.id}`) ? r.name : '???')).join(' • ')}</Text>
                {quests.length > 0 && <Text style={styles.label}>Aktivní úkoly</Text>}
                {quests.map((q) => (
                  <View key={q.id} style={styles.quest}>
                    <Icon name={CHARACTERS[q.giver].portrait} size={26} />
                    <View style={styles.questInfo}>
                      <Text style={styles.questTitle}>{q.title}</Text>
                      <Text style={styles.questType}>{CATEGORY_LABEL[q.category]}</Text>
                    </View>
                  </View>
                ))}
                {save.storyChapter >= CHAPTER_COUNT && <Text style={styles.sub}>Hlavní příběh je dokončený – volný průzkum.</Text>}
              </>
            )}
          </ScrollView>
          <View style={styles.buttons}>
            <GameButton
              label={!open ? 'Zamčeno' : selected === save.ocean ? 'Vyplout' : 'Plout sem'}
              variant={open ? 'green' : 'navy'}
              size="sm"
              disabled={!open}
              onPress={() => onTravel(selected)}
            />
            <GameButton label="Zpět" variant="blue" size="sm" onPress={onClose} />
          </View>
        </Panel>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 },
  map: { borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: COLORS.navy },
  pin: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  pinText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 15, lineHeight: 19, ...textShadow },
  here: { position: 'absolute', bottom: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.coral, borderWidth: 2, borderColor: COLORS.white },
  panel: { gap: 8 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 6 },
  sub: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12 },
  mechanic: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  label: { color: COLORS.aqua, fontFamily: FONTS.title, fontSize: 14, marginTop: 4 },
  gearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gear: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  gearText: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  quest: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  questInfo: { flex: 1 },
  questTitle: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 13 },
  questType: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 11 },
  buttons: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
});
