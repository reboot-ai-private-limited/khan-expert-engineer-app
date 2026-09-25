import React from 'react';
import { Stack } from 'expo-router';

/**
 * The Profile tab is a small stack: the profile screen, then Edit profile,
 * My Skills, KYC Documents and the rest pushed on top. Every screen builds
 * its own header, so the native one stays off.
 */
export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="password" />
      <Stack.Screen name="skills" />
      <Stack.Screen name="kyc" />
      <Stack.Screen name="id-cards" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="advance" />
      <Stack.Screen name="advance-expense" />
    </Stack>
  );
}
