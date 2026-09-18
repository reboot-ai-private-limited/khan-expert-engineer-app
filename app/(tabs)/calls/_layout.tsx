import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { isAccountActive } from '@/utils/accountStatus';

/**
 * The "My jobs" tab is itself a small stack: the list, then a job's detail
 * screen pushed on top of it. Both screens build their own headers to match
 * the rest of the app, so the native header stays off here too.
 *
 * The parent tabs layout now lets a still-onboarding engineer in far enough
 * to reach Profile → KYC/skills, so job assignment is guarded here instead
 * — there is nothing to see until an admin activates the account.
 */
export default function CallsStackLayout() {
  const { engineer } = useAuth();

  if (!isAccountActive(engineer)) {
    return <Redirect href="/(auth)/status" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="list" />
      <Stack.Screen name="[id]" />
      {/* One screen per job step — see src/utils/jobSteps.ts for the order. */}
      <Stack.Screen name="ride" />
      <Stack.Screen name="check-in" />
      <Stack.Screen name="product" />
      <Stack.Screen name="work" />
      <Stack.Screen name="spares" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="charges" />
      <Stack.Screen name="sign" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="check-out" />
      <Stack.Screen name="job-sheet" />
      {/* Not a step — reporting status must stay reachable at any point. */}
      <Stack.Screen name="status" />
      <Stack.Screen name="signature" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
