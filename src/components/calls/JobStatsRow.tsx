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
  /** Tapping a tile opens the full list for that filter. */
  onSelect: (filter: JobFilter) => void;
}

interface TileStyle {
  filter: JobFilter;
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon, count and chevron colour. */
  accent: string;
  /** Tile background. */
  wash: string;
  /** Icon square and chevron circle. */
  chip: string;
  border: string;
}

/**
 * The buckets, most urgent first ("what's on today") out to the widest
 * ("everything"). All Jobs sits on its own full-width row below the four.
 */
const TILES: TileStyle[] = [
  { filter: 'today', icon: 'calendar', accent: '#1D6FE0', wash: '#EEF5FF', chip: '#DCEAFE', border: '#D5E5FB' },
  { filter: 'pending', icon: 'time-outline', accent: '#E0A100', wash: '#FFF9E8', chip: '#FDEFC4', border: '#F6E7B8' },
  { filter: 'open', icon: 'briefcase', accent: '#4C3AA8', wash: '#F4F2FD', chip: '#E5E0FA', border: '#E2DDF6' },
  { filter: 'open_today', icon: 'calendar-outline', accent: '#E0344B', wash: '#FFF1F2', chip: '#FDDDE1', border: '#F9D6DB' },
];

const ALL_TILE: TileStyle = {
  filter: 'all',
  icon: 'grid',
  accent: '#1E293B',
  wash: '#F1F5FA',
  chip: '#E2E8F0',
  border: '#DDE4EE',
};

const LABEL: Partial<Record<JobFilter, string>> = { all: 'All Jobs' };

/**
 * The summary tiles at the top of the jobs screen. Counts are derived from
 * the list already in memory rather than the server's `summary`, so the
 * number on a tile always equals the number of rows the list it opens will
 * show — the server summary has no "today" and buckets "pending" more
 * narrowly than this screen means it.
 */
export const JobStatsRow: React.FC<JobStatsRowProps> = ({ calls, closedCalls, onSelect }) => {
  const count = useMemo(
    () => (filter: JobFilter) =>
      // closedCalls belongs only in the bucket that means "everything".
      countByJobFilter(calls, filter) + (filter === 'all' ? closedCalls.length : 0),
    [calls, closedCalls]
  );

  const renderTile = (tile: TileStyle, wide = false) => {
    const label = LABEL[tile.filter] ?? jobFilterLabel[tile.filter];
    const n = count(tile.filter);
    return (
      <Pressable
        key={tile.filter}
        onPress={() => onSelect(tile.filter)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${n} jobs. Opens the full list.`}
        style={({ pressed }) => [
          styles.tile,
          wide ? styles.tileWide : styles.tileHalf,
          { backgroundColor: tile.wash, borderColor: tile.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: tile.chip }]}>
          <Ionicons name={tile.icon} size={20} color={tile.accent} />
        </View>
        {/* Label on its own line with the full width beside the icon — on a
            half-width tile, sharing it with the chevron broke words apart
            ("Toda / y's"). The chevron sits with the count underneath. */}
        <View style={styles.text}>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          <View style={styles.countRow}>
            <Text style={[styles.count, { color: tile.accent }]}>{n}</Text>
            <View style={[styles.chevron, { backgroundColor: tile.chip }]}>
              <Ionicons name="chevron-forward" size={15} color={tile.accent} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.grid}>
      {TILES.map((tile) => renderTile(tile))}
      {renderTile(ALL_TILE, true)}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 72,
  },
  tileHalf: {
    width: '49%',
  },
  tileWide: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    ...typography.small,
    fontSize: 13,
    lineHeight: 17,
    color: colors.text,
    fontWeight: '600',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  chevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
