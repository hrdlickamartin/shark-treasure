import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KIT, MATERIAL_IDS, MATERIALS, type KitId, type MaterialCounts, type MaterialId } from '../game/gear';
import { todayKey } from '../game/modifiers';
import { OCEANS, weekIndex } from '../game/oceans';
import { Icon } from '../render/Sprite';
import { CHARACTERS } from '../progression/characters';
import { affordable, MOD_SLOTS, MODS, outputIcon, outputName, RECIPES, type ModId } from '../progression/crafting';
import { contractsFor, FACTION_IDS, FACTIONS, SHARD_REWARDS, TIERS, tierOf, type FactionId } from '../progression/factions';
import { MODULE_IDS, MODULES, openSlots, SLOTS, type ModuleId } from '../progression/modules';
import type { SaveData } from '../progression/saveData';
import { MAP_PIECE_PRICE, modulePrice, moduleLocked, RIFT_RULES, SAFARI_REWARD, safariTarget } from '../progression/tides';
import type { useProgress } from '../progression/useProgress';
import { GameButton } from './Button';
import { MoneyPill, Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS, textShadow } from './theme';

type Tab = 'contracts' | 'workshop' | 'boat';

interface Props {
  save: SaveData;
  width: number;
  height: number;
  progress: ReturnType<typeof useProgress>;
  onClose: () => void;
}

const GREETINGS: Record<FactionId, [string, string, string]> = {
  guild: ['Zakázky jsou na nástěnce. Nic víc, nic míň.', 'Cech si tě pamatuje. Máme lepší práci.', 'Pro tebe vždycky volné místo u mola.'],
  institute: ['Každý nález je otázka. Přines mi nějakou.', 'Muzeum roste. Díky tobě.', 'Bez tebe by Strážce zůstal jen legendou.'],
  brotherhood: ['Proud nečeká. Závodíš?', 'Bratrstvo ti fandí, kluku z Eliasovy lodi.', 'Kdo pluje s námi, má vždycky vítr v zádech.'],
  tidewatch: ['Trhliny jsou příležitost. Úlomky platíme dobře.', 'S tvými daty máme náskok.', 'Tentokrát s pojistkami. Slibujeme.'],
};

const TAB_LABEL: Record<Tab, string> = { contracts: 'Zakázky', workshop: 'Dílna', boat: 'Loď' };

function Cost({ cost, have, money }: { cost: MaterialCounts; have: MaterialCounts; money?: number }) {
  return (
    <View style={styles.costRow}>
      {(Object.entries(cost) as [MaterialId, number][]).map(([id, n]) => (
        <View key={id} style={styles.cost}>
          <Icon name={MATERIALS[id].sprite} size={16} />
          <Text style={[styles.costText, (have[id] ?? 0) < n && { color: COLORS.coral }]}>
            {have[id] ?? 0}/{n}
          </Text>
        </View>
      ))}
      {!!money && <Text style={styles.costText}>{money.toLocaleString('cs-CZ')} $</Text>}
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function Contracts({ save, progress }: { save: SaveData; progress: Props['progress'] }) {
  const day = todayKey();
  const done = save.contracts.day === day ? save.contracts.done : [];
  const week = weekIndex();
  const safari = safariTarget(week);
  const safariDone = save.safari.week === week && save.safari.done;
  return (
    <>
      {save.shards.pending > 0 && (
        <View style={[styles.card, { borderColor: COLORS.aqua }]}>
          <View style={styles.cardHead}>
            <Icon name="atlantean_shard" size={30} />
            <Text style={styles.cardTitle}>Atlantský úlomek ×{save.shards.pending} – komu ho předáš?</Text>
          </View>
          {FACTION_IDS.map((f) => (
            <View key={f} style={styles.handRow}>
              <Icon name={FACTIONS[f].icon} size={24} />
              <Text style={[styles.small, styles.flex]}>{SHARD_REWARDS[f].text} (+100 rep., soupeř −40)</Text>
              <GameButton label="Předat" size="xs" variant="gold" onPress={() => progress.handOver(f)} />
            </View>
          ))}
        </View>
      )}
      <Text style={styles.section}>Frakce</Text>
      {FACTION_IDS.map((f) => {
        const def = FACTIONS[f];
        const points = save.reputation[f];
        const tier = tierOf(points);
        const next = TIERS[tier + 1];
        const leader = CHARACTERS[def.leader];
        return (
          <View key={f} style={[styles.card, { borderColor: def.color }]}>
            <View style={styles.cardHead}>
              <Icon name={def.icon} size={30} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{def.name}</Text>
                <Text style={[styles.small, { color: def.color }]}>
                  {TIERS[tier].name} • {points} bodů{next ? ` / ${next.points}` : ''}
                </Text>
              </View>
              <Icon name={leader.portrait} size={34} />
            </View>
            <Bar value={next ? (points - TIERS[tier].points) / (next.points - TIERS[tier].points) : 1} color={def.color} />
            <Text style={styles.quote}>
              {leader.name.split(' ')[0]}: „{GREETINGS[f][tier >= 3 ? 2 : tier >= 1 ? 1 : 0]}“
            </Text>
            <Text style={styles.small}>Chce: {def.wants}. Odměny: {def.rewards}.</Text>
          </View>
        );
      })}
      <Text style={styles.section}>Dnešní zakázky</Text>
      {contractsFor(day).map((c) => {
        const finished = done.includes(c.id);
        return (
          <View key={c.id} style={styles.row}>
            <Icon name={FACTIONS[c.faction].icon} size={26} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{c.label}</Text>
              <Text style={styles.small}>
                +{c.money.toLocaleString('cs-CZ')} $ • +{c.rep} rep. {c.materials ? '' : '• splníš při ponoru'}
              </Text>
              {c.materials && !finished && <Cost cost={c.materials} have={save.materials} />}
            </View>
            {finished ? (
              <Text style={styles.done}>Hotovo</Text>
            ) : c.materials ? (
              <GameButton label="Odevzdat" size="xs" variant="green" disabled={!affordable(save.materials, c.materials)} onPress={() => progress.claim(c.id)} />
            ) : null}
          </View>
        );
      })}
      <Text style={styles.section}>Lov pokladů</Text>
      <View style={styles.row}>
        <Icon name="bottle_map" size={30} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{save.hunt.active ? 'Mapa je složená!' : `Útržky mapy: ${save.hunt.pieces}/3`}</Text>
          <Text style={styles.small}>{save.hunt.active ? save.hunt.active.clue : 'Láhve se vzkazem plují po moři. Tři útržky složí mapu k pokladu.'}</Text>
        </View>
        {!save.hunt.active && (
          <GameButton label={`Útržek ${MAP_PIECE_PRICE.toLocaleString('cs-CZ')} $`} size="xs" variant="blue" disabled={tierOf(save.reputation.brotherhood) < 1 || save.money < MAP_PIECE_PRICE} onPress={() => progress.buyMap()} />
        )}
      </View>
      <Text style={styles.section}>Fotosafari týdne</Text>
      <View style={styles.row}>
        <Icon name="icon_camera" size={28} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{safari.label}</Text>
          <Text style={styles.small}>{safariDone ? 'Splněno tento týden.' : `Odměna: ${SAFARI_REWARD.money} $, ${SAFARI_REWARD.research} dat, +${SAFARI_REWARD.rep} rep. Institutu`}</Text>
        </View>
      </View>
      {save.ending && (
        <>
          <Text style={styles.section}>Trhliny Srdce</Text>
          {save.rifts.active.length === 0 && <Text style={styles.small}>Žádná trhlina není otevřená.</Text>}
          {save.rifts.active.map((r) => (
            <View key={r.id} style={styles.row}>
              <Icon name="rift_portal" size={26} />
              <Text style={[styles.rowTitle, styles.flex]}>
                {OCEANS[r.ocean].czech} • {Math.round(Math.abs(r.x) / 10)} m {r.x < 0 ? 'vlevo' : 'vpravo'}
              </Text>
              <Text style={styles.small}>ještě {r.left} ponory</Text>
            </View>
          ))}
          <Text style={styles.small}>
            Uzavřeno: {save.rifts.closed} • max. {RIFT_RULES[save.ending].max} najednou
          </Text>
        </>
      )}
    </>
  );
}

function Workshop({ save, progress }: { save: SaveData; progress: Props['progress'] }) {
  const kits = Object.entries(save.kit) as [KitId, number][];
  return (
    <>
      <Text style={styles.section}>Materiály</Text>
      <View style={styles.inventory}>
        {MATERIAL_IDS.map((id) => (
          <View key={id} style={styles.invItem}>
            <Icon name={MATERIALS[id].sprite} size={28} />
            <Text style={styles.invText}>{save.materials[id] ?? 0}</Text>
          </View>
        ))}
      </View>
      {kits.length > 0 && (
        <>
          <Text style={styles.section}>Výbava na ponor</Text>
          <View style={styles.inventory}>
            {kits.map(([id, n]) => (
              <View key={id} style={styles.invItem}>
                <Icon name={KIT[id].icon} size={26} />
                <Text style={styles.invText}>{n}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.section}>Recepty</Text>
      {RECIPES.map((r) => {
        const locked = !!r.unlock && tierOf(save.reputation[r.unlock.faction]) < r.unlock.tier;
        const owned = r.output.kind === 'mod' && save.mods.owned.includes(r.output.id);
        const can = !locked && !owned && save.money >= r.money && affordable(save.materials, r.cost);
        const effect = r.output.kind === 'kit' ? KIT[r.output.id].effect : r.output.kind === 'mod' ? MODS[r.output.id].effect : 'Zásoba na příští ponor';
        return (
          <View key={r.id} style={[styles.row, locked && styles.dim]}>
            <Icon name={outputIcon(r.output)} size={30} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>
                {outputName(r.output)} {r.output.kind === 'mod' ? `• ${MOD_SLOTS.find((m) => m.id === MODS[r.output.id as ModId].slot)?.name}` : ''}
              </Text>
              <Text style={styles.small}>{locked ? `Odemkne: ${FACTIONS[r.unlock!.faction].name} – ${TIERS[r.unlock!.tier].name}` : effect}</Text>
              {!locked && !owned && <Cost cost={r.cost} have={save.materials} money={r.money} />}
            </View>
            {owned ? <Text style={styles.done}>Máš</Text> : <GameButton label="Vyrobit" size="xs" variant="green" disabled={!can} onPress={() => progress.craftItem(r.id)} />}
          </View>
        );
      })}
      {save.mods.owned.length > 0 && <Text style={styles.section}>Modifikace výbavy</Text>}
      {MOD_SLOTS.map((slot) => {
        const owned = save.mods.owned.filter((m) => MODS[m].slot === slot.id);
        if (owned.length === 0) return null;
        return (
          <View key={slot.id} style={styles.row}>
            <Text style={[styles.rowTitle, styles.slotName]}>{slot.name}</Text>
            <View style={[styles.flex, styles.wrap]}>
              {owned.map((m) => (
                <GameButton key={m} label={MODS[m].name} size="xs" variant={save.mods.equipped[slot.id] === m ? 'gold' : 'navy'} onPress={() => progress.setMod(slot.id, save.mods.equipped[slot.id] === m ? null : m)} />
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
}

function Boat({ save, progress }: { save: SaveData; progress: Props['progress'] }) {
  const open = openSlots(save.upgrades.boat);
  return (
    <>
      <Text style={styles.section}>Sloty lodi ({open.length}/6)</Text>
      {SLOTS.map((slot) => {
        const unlocked = open.includes(slot.id);
        const owned = save.modules.owned.filter((m) => MODULES[m].slot === slot.id);
        const current = save.modules.equipped[slot.id];
        return (
          <View key={slot.id} style={[styles.row, !unlocked && styles.dim]}>
            <Text style={[styles.rowTitle, styles.slotName]}>{slot.name}</Text>
            <View style={[styles.flex, styles.wrap]}>
              {!unlocked && <Text style={styles.small}>Odemkne vyšší lodní motor</Text>}
              {unlocked && owned.length === 0 && <Text style={styles.small}>Prázdný slot</Text>}
              {unlocked &&
                owned.map((m) => (
                  <GameButton key={m} label={MODULES[m].name} size="xs" variant={current === m ? 'gold' : 'navy'} onPress={() => progress.setModule(slot.id, current === m ? null : m)} />
                ))}
            </View>
          </View>
        );
      })}
      <Text style={styles.section}>Moduly</Text>
      {MODULE_IDS.map((id: ModuleId) => {
        const def = MODULES[id];
        const owned = save.modules.owned.includes(id);
        const locked = moduleLocked(save, id);
        const price = modulePrice(save, id);
        const can = !owned && !locked && save.money >= price && affordable(save.materials, def.cost);
        return (
          <View key={id} style={[styles.row, locked && styles.dim]}>
            <Icon name={def.sprite} size={40} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>
                {def.name} • {SLOTS.find((s) => s.id === def.slot)?.name}
              </Text>
              <Text style={styles.small}>{locked ? `Odemkne: ${FACTIONS[def.faction!].name} – Důvěryhodný` : def.effect}</Text>
              {!owned && !locked && <Cost cost={def.cost} have={save.materials} money={price} />}
            </View>
            {owned ? <Text style={styles.done}>Máš</Text> : <GameButton label="Koupit" size="xs" variant="gold" disabled={!can} onPress={() => progress.purchaseModule(id)} />}
          </View>
        );
      })}
    </>
  );
}

export function Port({ save, width, height, progress, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(save.shards.pending > 0 ? 'contracts' : 'contracts');
  const compact = Math.min(width, height) < 520;
  return (
    <Overlay dim={0.7}>
      <Panel style={[styles.panel, { maxHeight: height - insets.top - insets.bottom - 16, width: Math.min(640, width - insets.left - insets.right - 16) }]}>
        <View style={styles.header}>
          <Icon name="icon_port" size={compact ? 28 : 36} />
          <Title size={compact ? 20 : 26}>{OCEANS[save.ocean].port}</Title>
          <View style={styles.flex} />
          <MoneyPill amount={save.money} compact={compact} />
        </View>
        <View style={styles.tabs}>
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <GameButton key={t} label={TAB_LABEL[t]} size="xs" variant={tab === t ? 'gold' : 'blue'} onPress={() => setTab(t)} style={styles.tab} />
          ))}
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'contracts' && <Contracts save={save} progress={progress} />}
          {tab === 'workshop' && <Workshop save={save} progress={progress} />}
          {tab === 'boat' && <Boat save={save} progress={progress} />}
        </ScrollView>
        <GameButton label="Zpět na loď" variant="blue" size="sm" onPress={onClose} style={styles.center} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: 8, paddingBottom: 6 },
  section: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 16, marginTop: 4, ...textShadow },
  card: { backgroundColor: 'rgba(16, 70, 132, 0.6)', borderRadius: 12, padding: 8, gap: 5, borderWidth: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 15, flexShrink: 1 },
  handRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 70, 132, 0.45)', borderRadius: 10, padding: 7 },
  rowTitle: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 13 },
  small: { color: COLORS.muted, fontFamily: FONTS.body, fontSize: 11, flexShrink: 1 },
  quote: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 12, fontStyle: 'italic' },
  done: { color: COLORS.seaweed, fontFamily: FONTS.title, fontSize: 13 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dim: { opacity: 0.55 },
  slotName: { width: 76 },
  costRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2, alignItems: 'center' },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  costText: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  inventory: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  invItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  invText: { color: COLORS.white, fontFamily: FONTS.title, fontSize: 14, ...textShadow },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(2, 16, 40, 0.75)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  center: { alignSelf: 'center' },
});
