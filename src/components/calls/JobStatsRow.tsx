import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { countByJobFilter, jobFilterLabel, type JobFilter } from '@/utils/callStatus';
import type { EngineerCall } from '@/types/call';

interface JobStatsRowProps {
  /** Live work — pending and today are counted from this. */
  calls: EngineerCall[];
  /** Finished work the office has closed; counted into Completed only. */
  closedCalls: EngineerCall[];
  /** Tapping a tile opens the full list for that filter. */
  onSelect: (filter: JobFilter) => void;
}

const TILES: { filter: JobFilter; accent: string; wash: string }[] = [
  { filter: 'pending', accent: colors.warning, wash: colors.warningWash },
  { filter: 'today', accent: colors.info, wash: colors.infoWash },
  { filter: 'completed', accent: colors.success, wash: colors.successWash },
];

/**
 * The three-up summary at the top of the jobs screen. Counts are derived
 * from the list already in memory rather than the server's `summary`, so
 * the number on a tile always equals the number of rows the list it opens
 * will show — the server summary has no "today" and buckets "pending"
 * more narrowly than this screen means it.
 */
export const JobStatsRow: React.FC<JobStatsRowProps> = ({ calls, closedCalls, onSelect }) => {
  const counts = useMemo(
    () =>
      // closedCalls is always empty — the office's closed jobs are not the
      // engineer's to see. Kept in the signature so the prop stays honest.
      TILES.map((tile) => ({
        ...tile,
        count:
          countByJobFilter(calls, tile.filter) + (tile.filter === 'completed' ? closedCalls.length : 0),
      })),
    [calls, closedCalls]
  );

  return (
    <View style={styles.row}>
      {counts.map(({ filter, accent, wash, count }) => (
        <Pressable
          key={filter}
          onPress={() => onSelect(filter)}
          accessibilityRole="button"
          accessibilityLabel={`${jobFilterLabel[filter]}, ${count} jobs. Opens the full list.`}
          style={({ pressed }) => [styles.tile, { backgroundColor: wash }, pressed && styles.tilePressed]}
        >
          <Text style={[typography.display, styles.count, { color: accent }]}>{count}</Text>
          <Text style={[typography.caption, styles.label, { color: accent }]} numberOfLines={1}>
            {jobFilterLabel[filter]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    gap: 2,
  },
  tilePressed: {
    opacity: 0.75,
  },
  count: {
    lineHeight: 34,
  },
  label: {
    fontWeight: '700',
  },
});
