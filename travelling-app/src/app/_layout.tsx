import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../store/AuthContext';
import { FavoritesProvider } from '../store/FavoritesContext';
import AnimatedSplash from '../components/AnimatedSplash';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <AnimatedSplash onFinish={() => setShowSplash(false)} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <FavoritesProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
      </FavoritesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1 },
});
