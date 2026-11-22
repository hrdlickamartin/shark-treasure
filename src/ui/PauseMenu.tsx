import { StyleSheet } from 'react-native';
import { GameButton } from './Button';
import { Overlay, Panel, Title } from './Panel';

interface Props {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
  diving: boolean;
}

export function PauseMenu({ onResume, onSettings, onQuit, diving }: Props) {
  return (
    <Overlay>
      <Panel style={styles.panel}>
        <Title>Pauza</Title>
        <GameButton label="Pokračovat" onPress={onResume} />
        <GameButton label="Nastavení" variant="blue" onPress={onSettings} />
        <GameButton label={diving ? 'Vzdát ponor' : 'Hlavní menu'} variant="red" onPress={onQuit} />
      </Panel>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, minWidth: 260, alignItems: 'stretch' },
});
