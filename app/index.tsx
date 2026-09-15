import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/theme';

/**
 * Entry gate. Holds the splash until the stored session has been read,
 * then routes once. Nothing else lives here.
 */
export default function Index() {
  const { status } = useAuth();

  if (status === 'restoring') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={[typography.small, styles.label]}>Loading…</Text>
      </View>
    );
  }

  return status === 'authenticated' ? (
    <Redirect href="/(tabs)/calls" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  label: {
    color: colors.textMuted,
  },
});
