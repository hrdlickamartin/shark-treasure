import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, textShadow } from './theme';

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Title({ children, color = COLORS.white, size = 30 }: { children: ReactNode; color?: string; size?: number }) {
  return <Text style={[styles.title, { color, fontSize: size }]}>{children}</Text>;
}

export function Overlay({ children, dim = 0.55 }: { children: ReactNode; dim?: number }) {
  return <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: `rgba(2, 16, 40, ${dim})` }]}>{children}</View>;
}

export function MoneyPill({ amount, compact }: { amount: number; compact?: boolean }) {
  return (
    <View style={[styles.money, compact && { paddingVertical: 3 }]}>
      <View style={styles.coin}>
        <Text style={styles.coinText}>$</Text>
      </View>
      <Text style={styles.moneyText}>{amount.toLocaleString('cs-CZ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.panel,
    borderRadius: RADIUS,
    borderWidth: 3,
    borderColor: '#2A7BD6',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontFamily: FONTS.title, textAlign: 'center', ...textShadow },
  overlay: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  money: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 43, 89, 0.85)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderWidth: 2,
    borderColor: '#2A7BD6',
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: '#C98A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { fontFamily: FONTS.title, color: '#8A5A00', fontSize: 12, lineHeight: 15 },
  moneyText: { fontFamily: FONTS.title, color: COLORS.gold, fontSize: 17, ...textShadow },
});
