import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { audio } from '../audio/audio';
import { COLORS, FONTS, textShadow } from './theme';

type Variant = 'green' | 'blue' | 'gold' | 'red' | 'navy';

const VARIANTS: Record<Variant, { bg: string; edge: string; text: string }> = {
  green: { bg: '#65C83C', edge: '#3E8E1F', text: COLORS.white },
  blue: { bg: '#1E8CE8', edge: '#0B5AA8', text: COLORS.white },
  gold: { bg: '#FFBF32', edge: '#C98A12', text: COLORS.navy },
  red: { bg: '#FF5C74', edge: '#C23049', text: COLORS.white },
  navy: { bg: '#123E7A', edge: '#06224A', text: COLORS.white },
};

interface Props {
  label?: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  silent?: boolean;
}

export function GameButton({ label, onPress, variant = 'green', icon, disabled, size = 'md', style, silent }: Props) {
  const colors = VARIANTS[variant];
  const pad = size === 'lg' ? 16 : size === 'md' ? 11 : size === 'sm' ? 7 : 6;
  const font = size === 'lg' ? 26 : size === 'md' ? 19 : size === 'sm' ? 15 : 13;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (!silent) audio.play('click', 0.7);
        onPress();
      }}
      style={({ pressed }) => [
        styles.outer,
        { backgroundColor: colors.edge, opacity: disabled ? 0.5 : 1, transform: [{ translateY: pressed ? 2 : 0 }] },
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={[styles.inner, { backgroundColor: colors.bg, paddingVertical: pad, paddingHorizontal: pad * 1.6, marginBottom: pressed ? 2 : 5 }]}>
          {icon}
          {label ? <Text style={[styles.label, { color: colors.text, fontSize: font }, variant !== 'gold' && textShadow]}>{label}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: 16, borderWidth: 2.5, borderColor: COLORS.navy },
  inner: { borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: FONTS.title, letterSpacing: 0.5 },
});
