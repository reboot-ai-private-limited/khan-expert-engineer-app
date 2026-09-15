import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { status } = useAuth();

  // An already-signed-in engineer has no business on the login screen.
  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/calls" />;
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
