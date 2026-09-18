import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CallCard } from '@/components/calls/CallCard';
import { JobStatsRow } from '@/components/calls/JobStatsRow';
import { SearchBar } from '@/components/calls/SearchBar';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { useAuth } from '@/context/AuthContext';
import { useCalls } from '@/context/CallsContext';
import { colors, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';

const matchesSearch = (call: EngineerCall, query: string): boolean => {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return [call.customerName, call.callNumber, call.contactNumber, call.address, call.productsName, call.brandName]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
};

export default function CallsScreen() {
  const insets = useSafeAreaInsets();
  const { engineer } = useAuth();
  const { calls, closedCalls, loading, refreshing, errorMessage, refresh } = useCalls();

  const [search, setSearch] = useState('');

  const filteredCalls = useMemo(() => calls.filter((call) => matchesSearch(call, search)), [calls, search]);

  const firstName = engineer?.name?.split(' ')[0] ?? 'there';

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <FlatList
        data={filteredCalls}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh(true)}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[typography.label, styles.eyebrow]}>Hi {firstName}</Text>
            <Text style={[typography.display, styles.title]}>Your jobs</Text>

            <JobStatsRow
              calls={calls}
              closedCalls={closedCalls}
              onSelect={(filter) => router.push({ pathname: '/(tabs)/calls/list', params: { filter } })}
            />

            <SearchBar value={search} onChangeText={setSearch} />

            {errorMessage && calls.length > 0 ? (
              <Notice tone="warning" message={errorMessage} />
            ) : null}
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
              <Text style={[typography.small, styles.loadingText]}>Loading your jobs…</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.centerBlock}>
              <Notice tone="error" message={errorMessage} />
              <Button label="Try again" variant="secondary" onPress={() => void refresh(false)} style={styles.retry} />
            </View>
          ) : calls.length === 0 ? (
            <View style={styles.centerBlock}>
              <Text style={[typography.bodyStrong, styles.emptyTitle]}>No jobs assigned yet</Text>
              <Text style={[typography.small, styles.emptyBody]}>
                When the office assigns you a job, it will show up here.
              </Text>
            </View>
          ) : (
            <View style={styles.centerBlock}>
              <Text style={[typography.bodyStrong, styles.emptyTitle]}>No jobs match</Text>
              <Text style={[typography.small, styles.emptyBody]}>Try a different search.</Text>
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
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.textMuted,
  },
  title: {
    color: colors.text,
    marginTop: -spacing.xs,
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
  loadingText: {
    color: colors.textMuted,
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
