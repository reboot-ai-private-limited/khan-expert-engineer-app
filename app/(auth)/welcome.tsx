import React from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { env } from '@/config/env';
import { colors, spacing, typography } from '@/theme';

const TERMS_URL = 'https://khanexpert.in/terms-conditions/';
const PRIVACY_URL = 'https://khanexpert.in/privacy-policy/';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const callSupport = () => {
    if (!env.supportPhone) return;
    void Linking.openURL(`tel:${env.supportPhone}`);
  };

  const openTerms = () => {
    void Linking.openURL(TERMS_URL);
  };

  const openPrivacy = () => {
    void Linking.openURL(PRIVACY_URL);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/electronics.png')}
        style={[styles.hero, { marginTop: insets.top }]}
        resizeMode="cover"
        accessibilityLabel="Khan Expert Technology — appliance repair"
      />

      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.middle}>
          <Text style={[typography.display, styles.title]}>Field Engineer</Text>
          <Text style={[typography.body, styles.subtitle]}>
            Log in to see the jobs assigned to you, or apply to join as an engineer.
          </Text>

          <View style={styles.actions}>
            <Button label="Log in" onPress={() => router.push('/(auth)/login')} />
            <Button
              label="Register as an engineer"
              variant="secondary"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </View>

        <View style={styles.footer}>
          {env.supportPhone ? (
            <Text style={[typography.small, styles.support]} onPress={callSupport}>
              Need help? Call the office · {env.supportPhone}
            </Text>
          ) : null}
          <View style={styles.legalRow}>
            <Text style={[typography.small, styles.terms]} onPress={openTerms}>
              Terms &amp; Conditions
            </Text>
            <Text style={[typography.small, styles.legalSeparator]}>·</Text>
            <Text style={[typography.small, styles.terms]} onPress={openPrivacy}>
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    width: '100%',
    height: 280,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  middle: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  footer: {
    gap: spacing.md,
    alignItems: 'center',
  },
  support: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '600',
  },
  terms: {
    color: colors.textFaint,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalSeparator: {
    color: colors.textFaint,
  },
});
