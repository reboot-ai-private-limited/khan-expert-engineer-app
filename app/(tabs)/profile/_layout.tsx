import React from 'react';
import { Stack } from 'expo-router';

/**
 * The Profile tab is a small stack: the profile screen, then My Skills or
 * KYC Documents pushed on top. All three build their own headers, so the
 * native one stays off.
 */
export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="skills" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="id-cards" />
    </Stack>
  );
}
