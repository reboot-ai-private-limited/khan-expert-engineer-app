import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { env } from '@/config/env';
import { colors, radius, spacing, typography } from '@/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const callSupport = () => {
    if (!env.supportPhone) return;
    void Linking.openURL(`tel:${env.supportPhone}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>KE</Text>
        </View>
        <Text style={[typography.display, styles.title]}>Field Engineer</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Log in to see the jobs assigned to you, or apply to join as an engineer.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Log in" onPress={() => router.push('/(auth)/login')} />
        <Button
          label="Register as an engineer"
          variant="secondary"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>

      {env.supportPhone ? (
        <Text style={[typography.small, styles.support]} onPress={callSupport}>
          Need help? Call the office · {env.supportPhone}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  header: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markText: {
    ...typography.title,
    color: colors.textOnBrand,
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.md,
  },
  support: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '600',
  },
});
