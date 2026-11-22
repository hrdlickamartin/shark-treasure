import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SaveData } from '../progression/save';
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
  return (
    <Overlay dim={0.65}>
      <Panel style={styles.panel}>
        <Title size={28}>Nastavení</Title>
        <Toggle label="Hudba" value={settings.music} onToggle={() => onChange({ music: !settings.music })} />
        <Toggle label="Zvukové efekty" value={settings.sfx} onToggle={() => onChange({ sfx: !settings.sfx })} />
        <Toggle label="Vibrace" value={settings.haptics} onToggle={() => onChange({ haptics: !settings.haptics })} />
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
        <GameButton label="Zpět" variant="blue" onPress={onClose} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 380, gap: 12, alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: COLORS.white, fontFamily: FONTS.bodyHeavy, fontSize: 16 },
  toggle: { minWidth: 80 },
  confirm: { gap: 8, alignItems: 'center' },
  warn: { color: COLORS.coral, fontFamily: FONTS.bodyHeavy, fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 10 },
});
