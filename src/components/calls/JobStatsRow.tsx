import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';
import { countByJobFilter, jobFilterLabel, type JobFilter } from '@/utils/callStatus';
import type { EngineerCall } from '@/types/call';

interface JobStatsRowProps {
  /** Live work — every bucket is counted from this. */
  calls: EngineerCall[];
  /** Finished work the office has closed; counted into All only. */
  closedCalls: EngineerCall[];
  /** Tapping a row opens the full list for that filter. */
  onSelect: (filter: JobFilter) => void;
}

/**
 * The buckets, top to bottom. The order runs from the most urgent question
 * ("what's on today") out to the widest ("everything"), so the row an
 * engineer needs first is the one nearest the top of the screen.
 */
const ROWS: { filter: JobFilter; accent: string; wash: string }[] = [
  { filter: 'today', accent: colors.info, wash: colors.infoWash },
  { filter: 'pending', accent: colors.warning, wash: colors.warningWash },
  { filter: 'open', accent: colors.textMuted, wash: colors.sunken },
  { filter: 'open_today', accent: colors.danger, wash: colors.dangerWash },
  { filter: 'all', accent: colors.textFaint, wash: colors.sunken },
];

/**
 * The summary stack at the top of the jobs screen. Counts are derived from
 * the list already in memory rather than the server's `summary`, so the
 * number on a row always equals the number of rows the list it opens will
 * show — the server summary has no "today" and buckets "pending" more
 * narrowly than this screen means it.
 */
export const JobStatsRow: React.FC<JobStatsRowProps> = ({ calls, closedCalls, onSelect }) => {
  const counts = useMemo(
    () =>
      // closedCalls is normally empty — the office's closed jobs are not the
      // engineer's to see — but when history has been fetched it belongs in
      // the one bucket that means "everything".
      ROWS.map((row) => ({
        ...row,
        count: countByJobFilter(calls, row.filter) + (row.filter === 'all' ? closedCalls.length : 0),
      })),
    [calls, closedCalls]
  );

  return (
    <View style={styles.stack}>
      {counts.map(({ filter, accent, wash, count }, index) => (
        <Pressable
          key={filter}
          onPress={() => onSelect(filter)}
          accessibilityRole="button"
          accessibilityLabel={`${jobFilterLabel[filter]}, ${count} jobs. Opens the full list.`}
          style={({ pressed }) => [
            styles.row,
            index > 0 && styles.rowDivided,
            pressed && styles.rowPressed,
          ]}
        >
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[typography.bodyStrong, styles.label]} numberOfLines={1}>
            {jobFilterLabel[filter]}
          </Text>
          <View style={[styles.badge, { backgroundColor: wash }]}>
            <Text style={[typography.caption, styles.count, { color: accent }]}>{count}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.sunken,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    flex: 1,
    color: colors.text,
  },
  badge: {
    minWidth: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  count: {
    fontWeight: '700',
  },
});
