import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameButton } from './Button';
import { COLORS, FONTS } from './theme';

interface Props {
  children: ReactNode;
  onReset: () => void;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Něco se pokazilo</Text>
        <Text style={styles.text}>Ponor jsme bezpečně ukončili. Postup zůstal uložený.</Text>
        <GameButton
          label="Zpátky na loď"
          onPress={() => {
            this.props.onReset();
            this.setState({ failed: false });
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.deep },
  title: { color: COLORS.gold, fontFamily: FONTS.title, fontSize: 26 },
  text: { color: COLORS.white, fontFamily: FONTS.body, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
});
