import React from 'react';
import { Stack } from 'expo-router';

/**
 * The "My jobs" tab is itself a small stack: the list, then a job's detail
 * screen pushed on top of it. Both screens build their own headers to match
 * the rest of the app, so the native header stays off here too.
 */
export default function CallsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
