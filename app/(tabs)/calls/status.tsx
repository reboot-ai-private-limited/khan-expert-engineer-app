import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { jobStatusesApi, type JobStatusOption } from '@/api/endpoints/jobStatuses';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, spacing, typography } from '@/theme';

const FALLBACK_SUB_STATUSES = [
  'In Progress',
  'Attended',
  'Pending Parts',
  'Customer Rescheduled',
  'Customer Refused',
];

const isCancelLike = (text: string): boolean => {
  const t = text.toLowerCase();
  return t.includes('cancel') || t.includes('refuse');
};

/**
 * Completing a job is the job sheet's business, not this screen's.
 *
 * The server refuses a completing status until check-out, signature and
 * payment all exist, so offering one here would only produce a 400. Those
 * options live at the end of the step flow where those gates are satisfied.
 */
const isCompletingLike = (text: string): boolean => {
  const t = text.toLowerCase();
  return t.includes('job done') || t.includes('work completed') || t === 'completed' || t.includes('close');
};

/**
 * Report what happened on the visit, at any point.
 *
 * Deliberately NOT a step: an engineer who arrives to an empty house needs
 * to report it immediately, and must not have to walk through charges,
 * signature and payment to reach a status box. Only completion is gated.
 */
export default function StatusScreen() {
  const insets = useSafeAreaInsets();
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const { getById, applyUpdate, refresh, loading } = useCalls();

  const call = callId ? getById(callId) : undefined;

  const [options, setOptions] = useState<string[]>(FALLBACK_SUB_STATUSES);
  const [subStatus, setSubStatus] = useState(call?.subStatus ?? '');
  const [cancelReason, setCancelReason] = useState(call?.cancelReason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    jobStatusesApi
      .getSubStatusOptions()
      .then((all: JobStatusOption[]) => {
        if (cancelled || all.length === 0) return;
        const usable = all.map((o) => o.name).filter((name) => !isCompletingLike(name));
        if (usable.length > 0) setOptions(usable);
      })
      .catch(() => {
        // The fallback list above is the same one the web CRM falls back to.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!call) {
    return (
      <View style={[styles.container, styles.centerAll, { paddingTop: insets.top }]}>
        {loading ? <ActivityIndicator size="large" color={colors.brand} /> : (
          <>
            <Text style={[typography.bodyStrong, styles.title]}>Job not found</Text>
            <Button label="Back" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const save = async () => {
    if (saving) return;
    setError(null);

    if (!subStatus.trim()) {
      setError('Choose what happened on this visit.');
      return;
    }
    if (isCancelLike(subStatus) && !cancelReason.trim()) {
      setError('A reason is required when reporting a cancellation or refusal.');
      return;
    }

    setSaving(true);
    try {
      const response = await engineerCallsApi.updateCall(call._id, {
        subStatus: subStatus.trim(),
        cancelReason: cancelReason.trim(),
      });
      applyUpdate(response.call);
      // The home tiles are server-computed counts, not derived from the list
      // in memory — refresh them now that a status has changed.
      void refresh(true);
      router.back();
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Nothing was saved — try again once you have signal.'
          : (serverMessage(err) ?? 'Could not update the status. Try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[typography.caption, styles.eyebrow]}>{call.callNumber}</Text>
          <Text style={[typography.title, styles.title]}>Report status</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.small, styles.intro]}>
          Tell the office where this job stands. To finish the job, use the Job sheet at the end of the steps.
        </Text>

        <SelectField
          label="What happened on this visit?"
          value={subStatus}
          options={options}
          onChange={setSubStatus}
        />

        {isCancelLike(subStatus) ? (
          <TextField
            label="Reason"
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder="Why could the job not go ahead?"
            multiline
          />
        ) : null}

        {error ? <Notice tone="error" message={error} /> : null}

        <Button label="Save status" loadingLabel="Saving…" onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  backArrow: { fontSize: 24, color: colors.brand, fontWeight: '700' },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { color: colors.textMuted },
  title: { color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  intro: { color: colors.textMuted },
});
