import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SkinId, Supplies } from '../game/types';
import { chapterName } from '../progression/quests';
import { SKINS, skinned } from '../progression/skins';
import { maxLevel, nextStoryChapter, SUPPLY_ITEMS, SUPPLY_LIMIT, supplyPrice, unlocked, UPGRADES, upgradeCost, type SupplyId, type UpgradeDef, type UpgradeId, type UpgradeLevels } from '../progression/upgrades';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { MoneyPill, Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  money: number;
  levels: UpgradeLevels;
  expedition: number;
  chapter: number;
  supplies: Supplies;
  onBuy: (id: UpgradeId) => void;
  onBuySupply: (id: SupplyId) => void;
  onBuySkin: (id: SkinId) => void;
  skins: SkinId[];
  skin: SkinId;
  onClose: () => void;
  width: number;
  height: number;
  discount?: number;
}

export function UpgradeShop({ money, levels, expedition, chapter, supplies, onBuy, onBuySupply, onBuySkin, skins, skin, onClose, width, height, discount = 1 }: Props) {
  const [tab, setTab] = useState<'gear' | 'skins'>('gear');
  const columns = width > 900 ? 4 : width > 560 ? 2 : 1;
  const cardWidth = Math.min(220, (Math.min(width - 60, 960) - (columns - 1) * 10) / columns);
  return (
    <Overlay dim={0.65}>
      <Panel style={[styles.panel, { maxHeight: height - 24, maxWidth: Math.min(width - 24, 980) }]}>
        <View style={styles.header}>
          <Title size={28}>Vylepšení</Title>
          <View style={styles.tabs}>
            <GameButton label="Vybavení" size="sm" variant={tab === 'gear' ? 'gold' : 'navy'} onPress={() => setTab('gear')} />
            <GameButton label="Vzhled" size="sm" variant={tab === 'skins' ? 'gold' : 'navy'} icon={<Icon name="icon_brush" size={18} />} onPress={() => setTab('skins')} />
          </View>
          <MoneyPill amount={money} />
        </View>
        {discount < 1 && <Text style={styles.unlock}>Sleva Přístavního cechu −{Math.round((1 - discount) * 100)} % na všechna vylepšení</Text>}
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {tab === 'skins' &&
            SKINS.map((def) => {
              const owned = skins.includes(def.id);
              const active = skin === def.id;
              return (
                <View key={def.id} style={[styles.card, { width: cardWidth }, active && styles.activeCard]}>
                  <View style={[styles.skinPreview, { backgroundColor: def.color }]}>
                    <Icon name={skinned('diver_swim1', def.id)} size={cardWidth * 0.62} />
                  </View>
                  <Text style={styles.name}>{def.name}</Text>
                  <GameButton
                    label={active ? 'Vybráno' : owned ? 'Vybrat' : `${def.price.toLocaleString('cs-CZ')} $`}
                    variant={active ? 'navy' : owned || money >= def.price ? 'green' : 'navy'}
                    size="sm"
                    disabled={active || (!owned && money < def.price)}
                    silent
                    onPress={() => onBuySkin(def.id)}
                  />
                </View>
              );
            })}
          {tab === 'gear' && UPGRADES.filter((def) => !def.expansion || levels[def.id] > 0).map((def) => {
            const level = levels[def.id];
            const max = maxLevel(def, expedition, chapter);
            const open = unlocked(def, expedition);
            const maxed = level >= max;
            const cost = Math.round(upgradeCost(def, level) * discount);
            const affordable = money >= cost;
            return (
              <View key={def.id} style={[styles.card, { width: cardWidth }, !open && styles.lockedCard]}>
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
                  {Array.from({ length: def.max + def.extra + (def.story?.length ?? 0) }, (_, i) => (
                    <View key={i} style={[styles.pip, i < level && styles.pipOn, i >= max && styles.pipLocked]} />
                  ))}
                </View>
                <Text style={styles.effect}>
                  {def.effect(level)}
                  {!maxed ? `  →  ${def.effect(level + 1)}` : ''}
                </Text>
                {open && maxed && <NextLevel def={def} expedition={expedition} chapter={chapter} />}
                <GameButton
                  label={!open ? `Od ${(def.unlockAt ?? 0) + 1}. výpravy` : maxed ? 'MAX' : `${cost.toLocaleString('cs-CZ')} $`}
                  variant={open && !maxed && affordable ? 'green' : 'navy'}
                  size="sm"
                  disabled={!open || maxed || !affordable}
                  silent
                  onPress={() => onBuy(def.id)}
                />
              </View>
            );
          })}
          {tab === 'gear' && (
            <View style={[styles.card, styles.supplies]}>
              <Text style={styles.name}>Zásoby na příští ponor</Text>
              <Text style={styles.desc}>Spotřebují se v dalším ponoru. V obchodě nejvýš {SUPPLY_LIMIT} od každé, další přidá obchodník na moři nebo dílna.</Text>
              <View style={styles.supplyRow}>
                {SUPPLY_ITEMS.map((item) => {
                  const price = supplyPrice(item.id, chapter);
                  const full = supplies[item.id] >= SUPPLY_LIMIT;
                  return (
                    <View key={item.id} style={styles.supply}>
                      <Icon name={item.icon} size={30} />
                      <Text style={styles.effect}>
                        {item.name} {supplies[item.id]}/{SUPPLY_LIMIT}
                      </Text>
                      <GameButton
                        label={full ? 'Plno' : `${price.toLocaleString('cs-CZ')} $`}
                        variant={!full && money >= price ? 'green' : 'navy'}
                        size="xs"
                        disabled={full || money < price}
                        silent
                        onPress={() => onBuySupply(item.id)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} style={styles.back} />
      </Panel>
    </Overlay>
  );
}

function NextLevel({ def, expedition, chapter }: { def: UpgradeDef; expedition: number; chapter: number }) {
  const story = nextStoryChapter(def, chapter);
  if (story !== null) return <Text style={styles.unlock}>Další úroveň po dokončení {chapterName(story)}</Text>;
  if (expedition < def.extra) return <Text style={styles.unlock}>Na příští výpravě půjde o úroveň výš (vybavení ale začne znovu od nuly)</Text>;
  return null;
}

const styles = StyleSheet.create({
  panel: { width: '100%', alignItems: 'stretch', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tabs: { flexDirection: 'row', gap: 6 },
  activeCard: { borderColor: COLORS.gold },
  skinPreview: { height: 86, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: 0.95 },
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
  pipLocked: { opacity: 0.25 },
  lockedCard: { opacity: 0.6 },
  effect: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 11 },
  unlock: { color: COLORS.aqua, fontFamily: FONTS.bodyHeavy, fontSize: 11 },
  back: { alignSelf: 'center' },
  supplies: { width: '100%', maxWidth: 700 },
  supplyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-around' },
  supply: { alignItems: 'center', gap: 4, minWidth: 110 },
});
