import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { OCEAN_ORDER, OCEANS, WORLD_OCEANS } from '../game/oceans';
import { MATERIAL_IDS, MATERIALS } from '../game/gear';
import { SPECIES, speciesById } from '../progression/encyclopedia';
import { expeditionScale } from '../progression/expedition';
import { activeMissions, MISSIONS } from '../progression/missions';
import { CHARACTERS, MAYA_PHASES, type CharacterId } from '../progression/characters';
import { activeQuests, CATEGORY_LABEL, CHAPTER_COUNT, EMPTY_QUEST, QUESTS, stepKey, type QuestCategory, type QuestDef } from '../progression/quests';
import { RELICS, SET_BONUS } from '../progression/relics';
import { canResearch, explorerLevel, levelXp, RESEARCH } from '../progression/research';
import type { SaveData } from '../progression/saveData';
import { ENDINGS, TIDE_ENDINGS } from '../progression/story';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

type Tab = 'quests' | 'crew' | 'catalog' | 'research' | 'missions' | 'collection';

const TABS: { id: Tab; label: string }[] = [
  { id: 'quests', label: 'Úkoly' },
  { id: 'crew', label: 'Posádka' },
  { id: 'catalog', label: 'Katalog' },
  { id: 'research', label: 'Výzkum' },
  { id: 'missions', label: 'Mise' },
  { id: 'collection', label: 'Sbírka' },
];

interface Props {
  save: SaveData;
  width: number;
  height: number;
  onLearn: (id: string) => void;
  onClose: () => void;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
    </View>
  );
}

function QuestCard({ quest, save }: { quest: QuestDef; save: SaveData }) {
  const state = save.quests[quest.id] ?? EMPTY_QUEST;
  const giver = CHARACTERS[quest.giver];
  return (
    <View style={[styles.card, state.done && styles.cardDone]}>
      <View style={styles.row}>
        <Icon name={giver.portrait} size={30} />
        <View style={styles.questHead}>
          <Text style={styles.cardTitle}>{state.done ? `✓ ${quest.title}` : quest.title}</Text>
          <Text style={styles.kicker}>
            {OCEANS[quest.ocean].czech} • {giver.name}
          </Text>
        </View>
        <Text style={styles.reward}>+{quest.reward.money.toLocaleString('cs-CZ')} $</Text>
      </View>
      {!state.done && (
        <>
          <Text style={styles.text}>{quest.brief}</Text>
          {quest.steps.map((step, i) => {
            const done = state.flags.includes(stepKey(quest.id, i));
            return (
              <Text key={i} style={[styles.step, done && styles.stepDone]}>
                {done ? '✓' : '○'} {step.label}
              </Text>
            );
          })}
          {quest.reward.upgrade && <Text style={styles.hint}>Odměna: {quest.reward.upgrade.label}</Text>}
        </>
      )}
    </View>
  );
}

function Quests({ save }: { save: SaveData }) {
  const active = activeQuests(save.quests, save.oceans, save.flags);
  const done = QUESTS.filter((q) => save.quests[q.id]?.done);
  const chapter = Math.min(save.storyChapter, CHAPTER_COUNT - 1);
  return (
    <>
      <Text style={styles.note}>
        Kapitola {Math.min(save.storyChapter + 1, CHAPTER_COUNT)}/{CHAPTER_COUNT}: {OCEANS[OCEAN_ORDER[chapter]].czech}
        {save.ending ? ` • Konec: ${ENDINGS[save.ending].title}` : ''}
      </Text>
      {save.flags.includes('expansion') && (
        <Text style={styles.note}>
          Živé proudy: kapitola {Math.min(save.tideChapter, 12)}/12{save.tideEnding ? ` • Konec: ${TIDE_ENDINGS[save.tideEnding].title}` : ''}
        </Text>
      )}
      {(Object.keys(CATEGORY_LABEL) as QuestCategory[]).map((category) => {
        const list = active.filter((q) => q.category === category);
        if (!list.length) return null;
        return (
          <View key={category} style={styles.group}>
            <Text style={styles.section}>{CATEGORY_LABEL[category]}</Text>
            {list.map((q) => (
              <QuestCard key={q.id} quest={q} save={save} />
            ))}
          </View>
        );
      })}
      {active.length === 0 && <Text style={styles.note}>Žádné aktivní úkoly. Prozkoumej mapu světa.</Text>}
      {done.length > 0 && (
        <>
          <Text style={styles.section}>Splněné ({done.length})</Text>
          <Text style={styles.text}>{done.map((q) => q.title).join(' • ')}</Text>
        </>
      )}
    </>
  );
}

function Crew({ save, cardWidth }: { save: SaveData; cardWidth: number }) {
  const phase = MAYA_PHASES[Math.min(save.storyChapter, MAYA_PHASES.length - 1)];
  const met = new Set<CharacterId>(['maya', 'elias', ...save.met]);
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.kicker}>Vztah s Mayou</Text>
        <Text style={styles.cardTitle}>{phase.title}</Text>
        <Text style={styles.text}>{phase.text}</Text>
      </View>
      <View style={styles.grid}>
        {(Object.keys(CHARACTERS) as CharacterId[]).map((id) => {
          const c = CHARACTERS[id];
          const known = met.has(id);
          return (
            <View key={id} style={[styles.tile, { width: cardWidth * 2 + 8 }, known && styles.tileOn]}>
              <Icon name={c.portrait} size={64} style={known ? undefined : styles.locked} />
              <Text style={styles.tileName}>{known ? c.name : '???'}</Text>
              <Text style={styles.tileSub}>{known ? c.role : 'Zatím jste se nepotkali'}</Text>
              {known && <Text style={styles.text}>{c.bio}</Text>}
            </View>
          );
        })}
      </View>
    </>
  );
}

function Catalog({ save, cardWidth }: { save: SaveData; cardWidth: number }) {
  const found = SPECIES.filter((s) => save.encyclopedia[s.id]).length;
  return (
    <>
      <Text style={styles.note}>
        Vyfoceno {found}/{SPECIES.length} druhů. Fotoaparát koupíš ve Vylepšení, lepší snímek zblízka a v klidu.
      </Text>
      <View style={styles.grid}>
        {SPECIES.map((s) => {
          const stars = save.encyclopedia[s.id] ?? 0;
          return (
            <View key={s.id} style={[styles.tile, { width: cardWidth }, stars > 0 && styles.tileOn]}>
              <Icon name={s.sprite} size={48} style={stars ? undefined : styles.locked} />
              <Text style={styles.tileName}>{stars ? s.name : '???'}</Text>
              <Text style={styles.tileSub}>{stars ? `${stars}/3 • ${s.group}` : s.group}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function Research({ save, onLearn, cardWidth }: { save: SaveData; onLearn: (id: string) => void; cardWidth: number }) {
  const level = explorerLevel(save.xp);
  const from = levelXp(level);
  const to = levelXp(level + 1);
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Průzkumník úrovně {level}</Text>
        <ProgressBar value={(save.xp - from) / (to - from)} />
        <Text style={styles.hint}>
          {save.xp - from}/{to - from} XP • výzkumná data: {save.researchData}
        </Text>
      </View>
      <View style={styles.grid}>
        {RESEARCH.map((r) => {
          const owned = save.research.includes(r.id);
          const able = canResearch(r, save.research, save.researchData);
          const blocked = r.requires && !save.research.includes(r.requires);
          return (
            <View key={r.id} style={[styles.tile, { width: cardWidth }, owned && styles.tileOn]}>
              <Icon name={r.icon} size={40} />
              <Text style={styles.tileName}>{r.name}</Text>
              <Text style={styles.tileSub}>{r.description}</Text>
              {blocked && !owned && <Text style={styles.tileSub}>Vyžaduje: {RESEARCH.find((x) => x.id === r.requires)?.name}</Text>}
              <GameButton label={owned ? 'Hotovo' : `${r.cost} dat`} size="sm" variant={able ? 'green' : 'navy'} disabled={!able} silent onPress={() => onLearn(r.id)} />
            </View>
          );
        })}
      </View>
    </>
  );
}

function Missions({ save }: { save: SaveData }) {
  const scale = expeditionScale(save.expedition).missions;
  const done = MISSIONS.filter((m) => save.missionsDone.includes(m.id));
  const s = save.stats;
  return (
    <>
      {activeMissions(save.missionsDone).map((m) => {
        const progress = Math.min(m.target, save.missionProgress[m.id] ?? 0);
        return (
          <View key={m.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.reward}>+{Math.round(m.reward * scale)} $</Text>
            </View>
            <ProgressBar value={progress / m.target} />
          </View>
        );
      })}
      <Text style={styles.section}>
        Splněno {done.length}/{MISSIONS.length}
      </Text>
      <Text style={styles.note}>
        Ponory: {s.dives} • Úspěšné: {s.successes} • Truhlice: {s.chests} • Rekord: {s.bestDepth} m • Celkem: {s.totalEarned.toLocaleString('cs-CZ')} $
      </Text>
    </>
  );
}

function Collection({ save, cardWidth }: { save: SaveData; cardWidth: number }) {
  const owned = save.relics.length;
  return (
    <>
      <Text style={styles.section}>Relikvie {owned}/{RELICS.length}</Text>
      <View style={styles.grid}>
        {RELICS.map((relic) => {
          const has = save.relics.includes(relic.id);
          return (
            <View key={relic.id} style={[styles.tile, { width: cardWidth }, has && styles.tileOn]}>
              <Icon name={relic.sprite} size={42} style={has ? undefined : styles.locked} />
              <Text style={styles.tileName}>{has ? relic.name : '???'}</Text>
              <Text style={styles.tileSub}>{has ? relic.description : 'Ve vzácné truhle'}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>Kompletní sada přidá +{Math.round(SET_BONUS * 100)} % ke všem pokladům.</Text>
      {save.flags.includes('expansion') && (
        <>
          <Text style={styles.section}>Materiály a úlomky</Text>
          <View style={styles.grid}>
            {MATERIAL_IDS.map((id) => (
              <View key={id} style={[styles.tile, { width: cardWidth }, (save.materials[id] ?? 0) > 0 && styles.tileOn]}>
                <Icon name={MATERIALS[id].sprite} size={36} />
                <Text style={styles.tileName}>
                  {MATERIALS[id].name} ×{save.materials[id] ?? 0}
                </Text>
                <Text style={styles.tileSub}>{MATERIALS[id].source}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Atlantské úlomky celkem: {save.shards.total} • uzavřené trhliny: {save.rifts.closed} • poklady z map: {save.hunt.found}
          </Text>
          {save.aquarium.length > 0 && <Text style={styles.note}>Akvárium: {save.aquarium.map((id) => speciesById(id)?.name ?? id).join(', ')}</Text>}
        </>
      )}
      <Text style={styles.section}>Objevené lokace</Text>
      {WORLD_OCEANS.map((id) => {
        const ocean = OCEANS[id];
        const found = ocean.regions.filter((r) => save.discoveries.includes(`loc:${id}:${r.id}`));
        if (!save.oceans.includes(id)) return null;
        return (
          <View key={id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{ocean.czech}</Text>
              <Text style={styles.kicker}>
                {found.length}/{ocean.regions.length}
              </Text>
            </View>
            <Text style={styles.text}>{ocean.regions.map((r) => (found.includes(r) ? r.name : '???')).join(' • ')}</Text>
          </View>
        );
      })}
    </>
  );
}

export function Logbook({ save, width, height, onLearn, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('quests');
  const columns = width > 820 ? 4 : width > 520 ? 3 : 2;
  const panelW = Math.min(width - 24, 760);
  const cardWidth = (panelW - 40 - (columns - 1) * 8) / columns;
  return (
    <Overlay dim={0.7}>
      <Panel style={[styles.panel, { maxHeight: height - 24, width: panelW }]}>
        <View style={styles.header}>
          <Icon name="icon_story" size={30} />
          <Title size={24}>Deník průzkumníka</Title>
        </View>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <GameButton key={t.id} label={t.label} size="sm" variant={tab === t.id ? 'gold' : 'navy'} onPress={() => setTab(t.id)} />
          ))}
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'quests' && <Quests save={save} />}
          {tab === 'crew' && <Crew save={save} cardWidth={cardWidth} />}
          {tab === 'catalog' && <Catalog save={save} cardWidth={cardWidth} />}
          {tab === 'research' && <Research save={save} onLearn={onLearn} cardWidth={cardWidth} />}
          {tab === 'missions' && <Missions save={save} />}
          {tab === 'collection' && <Collection save={save} cardWidth={cardWidth} />}
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} style={styles.back} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 8, paddingBottom: 4 },
  group: { gap: 6 },
  questHead: { flex: 1 },
  step: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 12 },
  stepDone: { color: COLORS.seaweed },
  section: { color: COLORS.aqua, fontFamily: FONTS.title, fontSize: 15, marginTop: 4 },
  card: { backgroundColor: 'rgba(2, 16, 40, 0.5)', borderRadius: 12, padding: 10, gap: 4 },
  cardDone: { opacity: 0.6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  kicker: { color: COLORS.aqua, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  cardTitle: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14, flexShrink: 1 },
  text: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, lineHeight: 17 },
  hint: { color: COLORS.gold, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  reward: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 13 },
  note: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12, textAlign: 'center' },
  bar: { height: 7, borderRadius: 4, backgroundColor: 'rgba(2, 16, 40, 0.7)', overflow: 'hidden' },
  fill: { height: 7, backgroundColor: COLORS.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { alignItems: 'center', gap: 4, padding: 8, borderRadius: 12, backgroundColor: 'rgba(2, 16, 40, 0.5)' },
  tileOn: { backgroundColor: 'rgba(32, 212, 232, 0.15)', borderWidth: 1.5, borderColor: COLORS.aqua },
  tileName: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 12, textAlign: 'center' },
  tileSub: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 10, textAlign: 'center' },
  locked: { opacity: 0.18 },
  back: { alignSelf: 'center' },
});
