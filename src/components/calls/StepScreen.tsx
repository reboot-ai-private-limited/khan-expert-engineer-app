import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, spacing, typography } from '@/theme';
import { JOB_STEPS, isStepUnlocked, nextStepAfter, type JobStepKey } from '@/utils/jobSteps';
import type { EngineerCall } from '@/types/call';

interface StepScreenProps {
  stepKey: JobStepKey;
  /** Rendered with the live call. Everything a step needs comes from here. */
  children: (call: EngineerCall, applyUpdate: (updated: EngineerCall) => void) => React.ReactNode;
  /**
   * Replaces the default "Next" footer. Steps that finish the job, or that
   * have their own submit, pass their own.
   */
  footer?: (call: EngineerCall) => React.ReactNode;
  /** Hides the Next button until the step's own work is done. */
  canContinue?: (call: EngineerCall) => boolean;
}

/**
 * The shell every job step screen shares: header with its position in the
 * flow, the step's own body, and a Next button that walks to the following
 * step rather than dumping the engineer back on the overview.
 *
 * Reads the call from CallsContext by `?callId=` — the same query-param
 * approach the signature screen uses, rather than a dynamic segment, so
 * these stay plain siblings inside the calls stack and keep access to
 * CallsProvider.
 */
export const StepScreen: React.FC<StepScreenProps> = ({ stepKey, children, footer, canContinue }) => {
  const insets = useSafeAreaInsets();
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const { calls, getById, applyUpdate, loading, errorMessage, refresh } = useCalls();

  const call = callId ? getById(callId) : undefined;
  const index = JOB_STEPS.findIndex((s) => s.key === stepKey);
  const step = JOB_STEPS[index];

  // Same as the job screen: opened with an empty list (the first load
  // failed, or a cold reopen after a restart) — fetch once instead of
  // declaring the job missing.
  useEffect(() => {
    if (!call && calls.length === 0 && !loading) {
      void refresh(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!call) {
    return (
      <View style={[styles.container, styles.centerAll, { paddingTop: insets.top }]}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.brand} />
        ) : (
          <>
            <Text style={[typography.bodyStrong, styles.mutedTitle]}>
              {errorMessage ? 'Could not load this job' : 'Job not found'}
            </Text>
            {errorMessage ? <Notice tone="warning" message={errorMessage} /> : null}
            <Button label="Try again" variant="secondary" onPress={() => void refresh(false)} />
            <Button label="Back to jobs" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const unlocked = isStepUnlocked(call, stepKey);
  const next = nextStepAfter(call, stepKey);
  const showNext = !footer && next && (!canContinue || canContinue(call));

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
          <Text style={[typography.caption, styles.headerEyebrow]}>
            Step {index + 1} of {JOB_STEPS.length} · {call.callNumber}
          </Text>
          <Text style={[typography.title, styles.headerTitle]} numberOfLines={1}>
            {step.title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {!unlocked ? (
          <Notice
            tone="warning"
            message="Finish the earlier steps first."
            action="Go back and complete what is still outstanding."
          />
        ) : (
          children(call, applyUpdate)
        )}

        {unlocked && showNext && next ? (
          <Button
            label={`Next: ${next.title}`}
            onPress={() => router.replace({ pathname: next.route as never, params: { callId: call._id } as never })}
            style={styles.next}
          />
        ) : null}

        {unlocked && footer ? footer(call) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerAll: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  mutedTitle: {
    color: colors.text,
  },
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
  backArrow: {
    fontSize: 24,
    color: colors.brand,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    color: colors.textMuted,
  },
  headerTitle: {
    color: colors.text,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  next: {
    marginTop: spacing.sm,
  },
});
