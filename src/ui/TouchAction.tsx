import type { ReactNode } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  onFire: () => void;
  children: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TouchAction({ onFire, children, disabled, style }: Props) {
  if (Platform.OS === 'web') {
    return (
      <Pressable onPress={onFire} disabled={disabled} style={style}>
        <View pointerEvents="none">{children}</View>
      </Pressable>
    );
  }
  return (
    <View style={style} onTouchStart={disabled ? undefined : onFire}>
      <View pointerEvents="none">{children}</View>
    </View>
  );
}
