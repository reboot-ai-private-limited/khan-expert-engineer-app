import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { isAccountActive } from '@/utils/accountStatus';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { status, engineer } = useAuth();
  const pathname = usePathname();

  // An already-signed-in, fully-onboarded engineer has no business on the
  // welcome/login/register screens. One still pending review is routed to
  // their status screen instead of the working app — guarded against
  // redirecting to itself once they're already there.
  if (status === 'authenticated') {
    if (isAccountActive(engineer)) return <Redirect href="/(tabs)/calls" />;
    if (!pathname.endsWith('/status')) return <Redirect href="/(auth)/status" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
