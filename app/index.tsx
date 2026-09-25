import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/context/AuthContext';
import { isAccountActive } from '@/utils/accountStatus';

/**
 * Entry gate. Holds the native splash screen until the stored session has
 * been read, then routes once. Nothing else lives here.
 */
export default function Index() {
  const { status, engineer } = useAuth();

  useEffect(() => {
    if (status !== 'restoring') {
      void SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'restoring') {
    // Render nothing — the native splash screen (app.json's
    // expo-splash-screen config) is still covering this.
    return null;
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return isAccountActive(engineer) ? (
    <Redirect href="/(tabs)/calls" />
  ) : (
    <Redirect href="/(auth)/status" />
  );
}
