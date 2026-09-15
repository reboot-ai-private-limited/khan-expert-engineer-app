import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/theme';
import { classifyStatus, statusPillPalette } from '@/utils/callStatus';

interface StatusPillProps {
  /** The raw jobStatus text — shown verbatim, coloured by its bucket. */
  jobStatus: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ jobStatus }) => {
  const bucket = classifyStatus(jobStatus);
  const palette = statusPillPalette[bucket];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text
        style={[typography.caption, styles.text, { color: palette.text }]}
        numberOfLines={1}
      >
        {jobStatus || 'Unknown'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  text: {
    fontWeight: '700',
  },
});
