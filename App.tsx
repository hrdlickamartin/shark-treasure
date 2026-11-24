import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/GameScreen';
import { ErrorBoundary } from './src/ui/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_700Bold, Nunito_800ExtraBold });
  const ready = fontsLoaded || !!fontError;
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar hidden />
        {ready && (
          <ErrorBoundary onReset={() => setSession((n) => n + 1)}>
            <GameScreen key={session} />
          </ErrorBoundary>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#063B78' },
});
