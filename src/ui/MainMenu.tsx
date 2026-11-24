import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  onSettings: () => void;
  onLogbook: () => void;
  onWorldMap: () => void;
  oceanName: string;
  onChallenge: () => void;
  onExpedition: () => void;
  expedition: number;
  onShaft: () => void;
  shaftLocked: boolean;
  shaftBest: number;
  challengeName: string | null;
}

const LOGO_ASPECT = 1.46;
const GAP = 8;

const coarsePointer = () => Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);

interface Tile {
  key: string;
  label: string;
  icon: ReactNode;
  variant: 'blue' | 'gold' | 'navy';
  disabled?: boolean;
  onPress: () => void;
}

export function MainMenu({ money, width, height, onPlay, onShop, onSettings, onLogbook, onWorldMap, oceanName, onChallenge, onExpedition, expedition, onShaft, shaftLocked, shaftBest, challengeName }: Props) {
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const compact = Math.min(width, height) < 520;
  const iconSize = compact ? 18 : 22;
  const innerW = width - insets.left - insets.right - 32;
  const innerH = height - insets.top - insets.bottom;
  const menuW = Math.min(landscape ? innerW * 0.5 : innerW, compact ? 380 : 460);
  const tileW = (menuW - GAP) / 2;
  const logo = landscape
    ? Math.min(innerW - menuW - 20, (innerH - 24 - (compact ? 100 : 130)) * LOGO_ASPECT, 520)
    : Math.min(innerW * 0.86, (innerH - (compact ? 330 : 420)) * LOGO_ASPECT, 460);
  const showLegend = !coarsePointer() && !compact;

  const tiles: Tile[] = [
    { key: 'map', label: 'Mapa světa', icon: <Icon name="icon_map" size={iconSize} />, variant: 'blue', onPress: onWorldMap },
    { key: 'shop', label: 'Vylepšení', icon: <Icon name="icon_tank" size={iconSize} />, variant: 'blue', onPress: onShop },
    { key: 'logbook', label: 'Deník', icon: <Icon name="icon_story" size={iconSize} />, variant: 'gold', onPress: onLogbook },
    { key: 'expedition', label: `${expedition + 1}. výprava`, icon: <Icon name="icon_expedition" size={iconSize} />, variant: 'blue', onPress: onExpedition },
    {
      key: 'challenge',
      label: challengeName ? `Výzva: ${challengeName}` : 'Výzva splněna',
      icon: <Icon name="icon_calendar" size={iconSize} />,
      variant: challengeName ? 'gold' : 'navy',
      disabled: !challengeName,
      onPress: onChallenge,
    },
    {
      key: 'shaft',
      label: shaftLocked ? 'Hlubina od 50 m' : shaftBest > 0 ? `Hlubina · ${shaftBest} m` : 'Hlubinný ponor',
      icon: <Icon name="icon_o2" size={iconSize} />,
      variant: shaftLocked ? 'navy' : 'blue',
      disabled: shaftLocked,
      onPress: onShaft,
    },
  ];

  const play = <GameButton label="HRÁT" size={compact ? 'md' : 'lg'} onPress={onPlay} style={{ width: landscape ? Math.min(logo, menuW) : menuW }} />;
  const ocean = (
    <View style={styles.oceanPill}>
      <Text style={[styles.ocean, { fontSize: compact ? 12 : 14 }]}>Oceán: {oceanName}</Text>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
      <View style={[styles.topBar, { top: insets.top + 10, right: insets.right + 12 }]}>
        <MoneyPill amount={money} compact={compact} />
        <GameButton label="Nastavení" variant="navy" size={compact ? 'xs' : 'sm'} onPress={onSettings} />
      </View>
      <View style={[styles.layout, { flexDirection: landscape ? 'row' : 'column', paddingTop: landscape ? 0 : 56, gap: landscape ? 20 : 12 }]}>
        <View style={styles.hero}>
          {logo > 120 && <Icon name="logo" size={logo} />}
          {landscape && play}
          {landscape && ocean}
        </View>
        <View style={[styles.menu, { width: menuW }]}>
          {!landscape && play}
          {!landscape && ocean}
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <GameButton key={tile.key} label={tile.label} variant={tile.variant} size={compact ? 'xs' : 'sm'} icon={tile.icon} disabled={tile.disabled} onPress={tile.onPress} style={{ width: tileW }} />
            ))}
          </View>
          {showLegend && <Text style={styles.controls}>Ovládání: joystick • WASD / šipky • mezerník = ponor / sonar • B = balón • R = plašič • E = harpuna • H = lékárnička • F = skútr • C = fotoaparát (znovu C = fotka)</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: 'rgba(2, 20, 50, 0.25)' },
  layout: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  topBar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1 },
  hero: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  menu: { alignItems: 'stretch', gap: GAP },
  oceanPill: { alignSelf: 'center', backgroundColor: 'rgba(8, 43, 89, 0.85)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1.5, borderColor: '#2A7BD6' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  ocean: { color: COLORS.aqua, fontFamily: FONTS.title, textAlign: 'center' },
  controls: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 11, opacity: 0.85, textAlign: 'center', marginTop: 4, ...textShadow },
});
