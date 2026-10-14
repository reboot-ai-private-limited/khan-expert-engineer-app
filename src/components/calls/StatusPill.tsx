import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/theme';
import { classifyStatus, statusPillPalette, type StatusBucket } from '@/utils/callStatus';

interface StatusPillProps {
  /** The raw jobStatus text — shown verbatim, coloured by its bucket. */
  jobStatus: string;
  /** Adds a small status icon before the text (the job cards use it). */
  withIcon?: boolean;
  /** Larger padding, for a pill sitting on its own row. */
  size?: 'sm' | 'md';
  /** The engineer/office sub-status ("Awaiting Parts"…), shown as a second chip like the website. */
  subStatus?: string;
}

const BUCKET_ICON: Record<StatusBucket, keyof typeof Ionicons.glyphMap | null> = {
  pending: 'time-outline',
  in_progress: null, // a dot
  completed: 'checkmark-circle',
  other: null,
};

export const StatusPill: React.FC<StatusPillProps> = ({ jobStatus, withIcon = false, size = 'sm', subStatus }) => {
  const bucket = classifyStatus(jobStatus);
  const palette = statusPillPalette[bucket];
  const icon = BUCKET_ICON[bucket];
  // Only worth a second chip when it adds something the main pill does not say.
  const sub = subStatus?.trim();
  const showSub = Boolean(sub) && sub!.toLowerCase() !== (jobStatus ?? '').trim().toLowerCase();

  return (
    <View style={styles.wrap}>
    <View style={[styles.pill, size === 'md' && styles.pillMd, { backgroundColor: palette.bg }]}>
      {withIcon ? (
        icon ? (
          <Ionicons name={icon} size={16} color={palette.text} />
        ) : (
          <View style={[styles.dot, { backgroundColor: palette.text }]} />
        )
      ) : null}
      <Text
        style={[typography.caption, styles.text, size === 'md' && styles.textMd, { color: palette.text }]}
        numberOfLines={1}
      >
        {jobStatus || 'Unknown'}
      </Text>
    </View>
    {showSub ? (
      <View style={[styles.pill, size === 'md' && styles.pillMd, { backgroundColor: statusPillPalette.other.bg }]}>
        <Text
          style={[typography.caption, styles.text, size === 'md' && styles.textMd, { color: statusPillPalette.other.text }]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      </View>
    ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  pillMd: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontWeight: '700',
  },
  textMd: {
    fontSize: 14,
  },
});
