import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/theme';

/**
 * Placeholder. The assigned-call list is the next feature —
 * GET /api/engineer-calls already returns everything it needs.
 */
export default function CallsScreen() {
  const insets = useSafeAreaInsets();
  const { engineer } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={[typography.label, styles.eyebrow]}>Signed in as</Text>
      <Text style={[typography.title, styles.name]}>{engineer?.name ?? 'Engineer'}</Text>
      <Text style={[typography.body, styles.body]}>{engineer?.phone}</Text>

      <View style={styles.placeholder}>
        <Text style={[typography.body, styles.placeholderText]}>
          Your assigned jobs will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.textMuted,
  },
  name: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  body: {
    color: colors.textMuted,
  },
  placeholder: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.md,
  },
  placeholderText: {
    color: colors.textMuted,
  },
});
