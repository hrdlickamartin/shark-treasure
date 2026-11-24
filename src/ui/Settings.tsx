import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { SaveData } from '../progression/saveData';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';
import { COLORS, FONTS } from './theme';

interface Props {
  settings: SaveData['settings'];
  onChange: (patch: Partial<SaveData['settings']>) => void;
  onReset: () => void;
  onClose: () => void;
}

function Toggle({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <GameButton label={value ? 'ZAP' : 'VYP'} variant={value ? 'green' : 'navy'} size="sm" onPress={onToggle} style={styles.toggle} />
    </View>
  );
}

export function Settings({ settings, onChange, onReset, onClose }: Props) {
  const [confirm, setConfirm] = useState(false);
  const { height } = useWindowDimensions();
  return (
    <Overlay dim={0.65}>
      <Panel style={[styles.panel, { maxHeight: height - 24 }]}>
        <Title size={28}>Nastavení</Title>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Toggle label="Hudba" value={settings.music} onToggle={() => onChange({ music: !settings.music })} />
        <Toggle label="Zvukové efekty" value={settings.sfx} onToggle={() => onChange({ sfx: !settings.sfx })} />
        <Toggle label="Vibrace" value={settings.haptics} onToggle={() => onChange({ haptics: !settings.haptics })} />
        <Toggle label="Ukazatele úkolů" value={settings.markers} onToggle={() => onChange({ markers: !settings.markers })} />
        <Toggle label="Méně pohybu (bez otřesů)" value={settings.reduceMotion} onToggle={() => onChange({ reduceMotion: !settings.reduceMotion })} />
        <Toggle label="Pomalejší příliv" value={settings.slowTide} onToggle={() => onChange({ slowTide: !settings.slowTide })} />
        <Toggle label="Tvary rarity truhel" value={settings.rarityShapes} onToggle={() => onChange({ rarityShapes: !settings.rarityShapes })} />
        <Toggle label="Větší text dialogů" value={settings.bigText} onToggle={() => onChange({ bigText: !settings.bigText })} />
        {confirm ? (
          <View style={styles.confirm}>
            <Text style={styles.warn}>Opravdu smazat veškerý postup?</Text>
            <View style={styles.buttons}>
              <GameButton
                label="Smazat"
                variant="red"
                size="sm"
                onPress={() => {
                  onReset();
                  setConfirm(false);
                }}
              />
              <GameButton label="Ne" variant="navy" size="sm" onPress={() => setConfirm(false)} />
            </View>
          </View>
        ) : (
          <GameButton label="Smazat postup" variant="red" size="sm" onPress={() => setConfirm(true)} />
        )}
        </ScrollView>
        <GameButton label="Zpět" variant="blue" onPress={onClose} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 400, gap: 9, alignItems: 'stretch' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  list: { gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 15, flexShrink: 1 },
  toggle: { minWidth: 80 },
  confirm: { gap: 8, alignItems: 'center' },
  warn: { color: COLORS.coral, fontFamily: FONTS.bodyHeavy, fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 10 },
});
