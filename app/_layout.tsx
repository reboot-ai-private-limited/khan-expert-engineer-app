import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme';

// Held open until app/index.tsx knows where to route — see its
// SplashScreen.hideAsync() call. Keeps the native splash on screen through
// the session restore instead of handing off to a separate loading screen.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* Edge-to-edge is the default in SDK 57, so the bar draws over the
            app background — `backgroundColor` no longer exists on this prop. */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="id-card/[callId]" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
