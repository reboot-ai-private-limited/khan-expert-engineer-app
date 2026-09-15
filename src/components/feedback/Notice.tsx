import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type NoticeTone = 'error' | 'warning' | 'info' | 'success';

interface NoticeProps {
  tone: NoticeTone;
  message: string;
  /** Optional second line — what the engineer should do about it. */
  action?: string;
}

const toneStyles: Record<NoticeTone, { bg: string; border: string; text: string }> = {
  error: { bg: colors.dangerWash, border: colors.danger, text: colors.danger },
  warning: { bg: colors.warningWash, border: colors.warning, text: colors.warning },
  info: { bg: colors.infoWash, border: colors.info, text: colors.info },
  success: { bg: colors.successWash, border: colors.success, text: colors.brandDark },
};

export const Notice: React.FC<NoticeProps> = ({ tone, message, action }) => {
  const palette = toneStyles[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: palette.bg, borderLeftColor: palette.border }]}
    >
      <Text style={[typography.small, styles.message, { color: palette.text }]}>{message}</Text>
      {action ? (
        <Text style={[typography.caption, styles.action, { color: palette.text }]}>{action}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  message: {
    fontWeight: '600',
  },
  action: {
    opacity: 0.9,
  },
});
