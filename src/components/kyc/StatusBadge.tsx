import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import type { KycDocumentStatus } from '@/types/kyc';

const LABEL: Record<KycDocumentStatus, string> = {
  not_uploaded: 'Not uploaded',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

const PALETTE: Record<KycDocumentStatus, { bg: string; text: string }> = {
  not_uploaded: { bg: colors.sunken, text: colors.textMuted },
  pending: { bg: colors.warningWash, text: colors.warning },
  verified: { bg: colors.successWash, text: colors.success },
  rejected: { bg: colors.dangerWash, text: colors.danger },
};

export const StatusBadge: React.FC<{ status: KycDocumentStatus }> = ({ status }) => {
  const palette = PALETTE[status];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[typography.caption, styles.text, { color: palette.text }]}>{LABEL[status]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  text: {
    fontWeight: '700',
  },
});
