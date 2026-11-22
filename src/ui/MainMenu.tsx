import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../render/Sprite';
import { GameButton } from './Button';
import { MoneyPill } from './Panel';
import { COLORS, FONTS, textShadow } from './theme';

interface Props {
  money: number;
  width: number;
  height: number;
  onPlay: () => void;
  onShop: () => void;
  onMissions: () => void;
  onSettings: () => void;
  missionsAvailable: number;
}

export function MainMenu({ money, width, height, onPlay, onShop, onMissions, onSettings, missionsAvailable }: Props) {
  const landscape = width > height;
  const logo = Math.min(landscape ? width * 0.42 : width * 0.82, landscape ? height * 0.62 * 1.55 : 460);
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { flexDirection: landscape ? 'row' : 'column' }]}>
      <View style={styles.logoBox}>
        <Icon name="logo" size={logo} />
      </View>
      <View style={styles.menu}>
        <MoneyPill amount={money} />
        <GameButton label="HRÁT" size="lg" onPress={onPlay} style={styles.play} />
        <View style={styles.row}>
          <GameButton label="Vylepšení" variant="blue" icon={<Icon name="icon_tank" size={22} />} onPress={onShop} />
          <GameButton label="Mise" variant="blue" icon={<Icon name="icon_trophy" size={22} />} onPress={onMissions} />
        </View>
        <GameButton label="Nastavení" variant="navy" size="sm" onPress={onSettings} />
        {missionsAvailable > 0 && <Text style={styles.hint}>Aktivní mise: {missionsAvailable}</Text>}
        <Text style={styles.controls}>Ovládání: joystick • WASD / šipky • mezerník = ponor / sonar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, backgroundColor: 'rgba(2, 20, 50, 0.25)' },
  logoBox: { alignItems: 'center', justifyContent: 'center' },
  menu: { alignItems: 'center', gap: 12, minWidth: 260 },
  play: { minWidth: 240 },
  row: { flexDirection: 'row', gap: 10 },
  hint: { color: COLORS.gold, fontFamily: FONTS.body, fontSize: 13, ...textShadow },
  controls: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 11, opacity: 0.85, textAlign: 'center', ...textShadow },
});
