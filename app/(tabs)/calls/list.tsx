import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CallCard } from '@/components/calls/CallCard';
import { SearchBar } from '@/components/calls/SearchBar';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, radius, spacing, typography } from '@/theme';
import { jobFilterLabel, matchesJobFilter, type JobFilter } from '@/utils/callStatus';
import type { EngineerCall } from '@/types/call';

const FILTERS: JobFilter[] = ['pending', 'today', 'completed'];

const isJobFilter = (value: unknown): value is JobFilter =>
  typeof value === 'string' && (FILTERS as string[]).includes(value);

const matchesSearch = (call: EngineerCall, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [call.customerName, call.callNumber, call.address, call.productsName, call.brandName]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
};

const EMPTY_COPY: Record<JobFilter, string> = {
  pending: 'Nothing outstanding right now — every assigned job is done.',
  today: 'Nothing scheduled for today.',
  completed: 'No finished jobs yet.',
};

/**
 * The full work list, opened from a tile on the jobs screen. Reads the same
 * CallsContext the home screen does — no second fetch — and filters in
 * memory, so the row count always matches the tile that opened it.
 */
export default function JobListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { calls, closedCalls, loading, refreshing, errorMessage, refresh } = useCalls();

  const [filter, setFilter] = useState<JobFilter>(isJobFilter(params.filter) ? params.filter : 'pending');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    if (filter !== 'completed') {
      return calls.filter((call) => matchesJobFilter(call, filter) && matchesSearch(call, search));
    }

    /**
     * Completed means all finished work: jobs the engineer marked done, plus
     * the ones the office has since closed.
     *
     * The closed ones are deliberately NOT run through matchesJobFilter — a
     * status of "Closed" classifies as 'other', not 'completed', so the
     * filter would throw away the very rows that were fetched as history.
     * Coming back from scope=closed is itself the proof they are finished.
     */
    const rows = [
      ...calls.filter((call) => matchesJobFilter(call, 'completed')),
      ...closedCalls,
    ].filter((call) => matchesSearch(call, search));

    // Newest first — history is read in reverse, unlike a live worklist.
    const when = (call: EngineerCall) =>
      new Date(call.visitdate ?? call.etaDate ?? call.callDate ?? 0).getTime();
    return rows.sort((a, b) => when(b) - when(a));
  }, [calls, closedCalls, filter, search]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>All work</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} tintColor={colors.brand} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.chipRow}>
              {FILTERS.map((option) => {
                const active = option === filter;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setFilter(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[typography.caption, active ? styles.chipTextActive : styles.chipText]}>
                      {jobFilterLabel[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <SearchBar value={search} onChangeText={setSearch} />

            <Text style={[typography.caption, styles.countLine]}>
              {visible.length} {visible.length === 1 ? 'job' : 'jobs'}
            </Text>

            {errorMessage && calls.length > 0 ? <Notice tone="warning" message={errorMessage} /> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/calls/[id]', params: { id: item._id } })}
            accessibilityRole="button"
            accessibilityLabel={`Open job for ${item.customerName}`}
          >
            <CallCard call={item} />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          ) : errorMessage ? (
            <View style={styles.centerBlock}>
              <Notice tone="error" message={errorMessage} />
              <Button label="Try again" variant="secondary" onPress={() => void refresh(false)} style={styles.retry} />
            </View>
          ) : (
            <View style={styles.centerBlock}>
              <Text style={[typography.bodyStrong, styles.emptyTitle]}>
                {search ? 'No jobs match' : jobFilterLabel[filter]}
              </Text>
              <Text style={[typography.small, styles.emptyBody]}>
                {search ? 'Try a different search.' : EMPTY_COPY[filter]}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  listHeader: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  countLine: {
    color: colors.textFaint,
  },
  separator: {
    height: spacing.md,
  },
  centerBlock: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.huge,
  },
  retry: {
    minWidth: 160,
  },
  emptyTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
