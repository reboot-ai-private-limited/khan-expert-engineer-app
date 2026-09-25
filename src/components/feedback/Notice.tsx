import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type NoticeTone = 'error' | 'warning' | 'info' | 'success';

interface NoticeProps {
  tone: NoticeTone;
  message: string;
  /** Optional second line — what the engineer should do about it. */
  action?: string;
  /** Shows a close button when given. Omitted everywhere a notice must stay. */
  onDismiss?: () => void;
}

const toneStyles: Record<NoticeTone, { bg: string; border: string; text: string }> = {
  error: { bg: colors.dangerWash, border: colors.danger, text: colors.danger },
  warning: { bg: colors.warningWash, border: colors.warning, text: colors.warning },
  info: { bg: colors.infoWash, border: colors.info, text: colors.info },
  success: { bg: colors.successWash, border: colors.success, text: colors.brandDark },
};

export const Notice: React.FC<NoticeProps> = ({ tone, message, action, onDismiss }) => {
  const palette = toneStyles[tone];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: palette.bg, borderLeftColor: palette.border }]}
    >
      <Text style={[typography.small, styles.message, { color: palette.text }, onDismiss && styles.dismissGap]}>
        {message}
      </Text>
      {action ? (
        <Text style={[typography.caption, styles.action, { color: palette.text }]}>{action}</Text>
      ) : null}
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.dismiss}
        >
          <Text style={[styles.dismissText, { color: palette.text }]}>✕</Text>
        </Pressable>
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
  // Keeps the message clear of the close button.
  dismissGap: {
    paddingRight: spacing.xl,
  },
  dismiss: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
