import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CancellationCard } from '@/components/calls/CancellationCard';
import { InfoRow } from '@/components/calls/InfoRow';
import { OfficeNotesCard } from '@/components/calls/OfficeNotesCard';
import { StatusPill } from '@/components/calls/StatusPill';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, radius, spacing, typography } from '@/theme';
import { isClosed, isFinished } from '@/utils/callStatus';
import { canShowCustomerLocation, openCustomerLocation } from '@/utils/maps';
import { JOB_STEPS, currentStep, isStepUnlocked, stepProgress, type JobStepDef } from '@/utils/jobSteps';
import type { EngineerCall } from '@/types/call';

const isLocked = (jobStatus: string, subStatus: string | undefined): boolean => {
  const s = [jobStatus, subStatus ?? ''].map((v) => v.trim().toLowerCase());
  return s.some((v) => v === 'job done' || v === 'completed' || v === 'work completed' || v === 'closed');
};

/**
 * The job overview.
 *
 * Used to be one long screen holding every part of the visit at once. It is
 * now a map of the job: the details that never change, and the list of
 * steps, each opening on its own screen. An engineer outdoors sees one task
 * at a time instead of scrolling past ten cards hunting for the live one.
 */
export default function CallDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { calls, loading, getById, refresh, applyUpdate } = useCalls();

  const call = getById(id);

  // A cold deep-link (or a stale list) may not have this call yet.
  useEffect(() => {
    if (!call && calls.length === 0 && !loading) {
      void refresh(false);
    }
  }, [call, calls.length, loading, refresh]);

  if (!call) {
    return (
      <View style={[styles.container, styles.centerAll, { paddingTop: insets.top }]}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[typography.small, styles.mutedText]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[typography.bodyStrong, styles.mutedTitle]}>Job not found</Text>
            <Text style={[typography.small, styles.mutedText]}>
              It may have been reassigned, or your list is out of date.
            </Text>
            <Button label="Back to jobs" onPress={() => router.back()} style={styles.backButton} />
          </>
        )}
      </View>
    );
  }

  // Any closed variant ("Closed", "Call Closed"…) is read-only, same as job done.
  const locked = isLocked(call.jobStatus, call.subStatus) || isClosed(call);
  const finished = isFinished(call);
  const cancellationPending = call.cancellationRequest?.status === 'pending';
  const machine = [call.brandName, call.productsName].filter(Boolean).join(' · ');
  const progress = stepProgress(call);
  const live = currentStep(call);

  const openStep = (step: JobStepDef) => {
    router.push({ pathname: step.route as never, params: { callId: call._id } as never });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[typography.caption, styles.headerCallNumber]} numberOfLines={1}>
            {call.callNumber}
          </Text>
          <Text style={[typography.title, styles.headerCustomer]} numberOfLines={1}>
            {call.customerName}
          </Text>
        </View>
        <StatusPill jobStatus={call.jobStatus} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        {/* Job summary — read-only */}
        <View style={styles.card}>
          {machine ? <Text style={[typography.bodyStrong, styles.machine]}>{machine}</Text> : null}
          <InfoRow label="Model" value={call.modelNumber} />
          <InfoRow label="Service type" value={call.serviceType} />
          <InfoRow label="Address" value={call.address} />
          <InfoRow label="Pincode" value={call.pincode} />
          <InfoRow label="Warranty" value={call.warrantyTerms} />

          {!locked ? (
            <ActionRow
              label="Show ID card"
              icon="card"
              onPress={() => router.push({ pathname: '/id-card/[callId]', params: { callId: call._id } })}
            />
          ) : null}

          {!locked ? (
            <ActionRow
              label="Report status"
              icon="flag"
              onPress={() => router.push({ pathname: '/(tabs)/calls/status', params: { callId: call._id } })}
            />
          ) : null}

          {canShowCustomerLocation(call) ? (
            <ActionRow label="Show on map" icon="location" onPress={() => void openCustomerLocation(call)} />
          ) : null}

          {/* Customer contact disappears once the job is finished — the
              engineer has no reason to hold the number afterwards. */}
          {call.contactNumber && !finished ? (
            <ActionRow
              label={`Call ${call.contactNumber}`}
              icon="call"
              onPress={() => void Linking.openURL(`tel:${call.contactNumber}`)}
            />
          ) : null}
        </View>

        <OfficeNotesCard notes={call.engineerNotes ?? []} />

        {!locked ? <CancellationCard call={call} onUpdated={applyUpdate} /> : null}

        {cancellationPending ? (
          <Notice
            tone="info"
            message="This job is locked while the office reviews your cancellation request."
            action="They will approve it or send it back to you."
          />
        ) : locked ? (
          <Notice
            tone="info"
            message={isClosed(call) ? 'This job is closed.' : 'This job is marked done and is locked.'}
            action="Contact the office if something needs to change."
          />
        ) : (
          <View style={styles.stepsBlock}>
            <View style={styles.stepsHeader}>
              <Text style={[typography.label, styles.stepsTitle]}>Steps</Text>
              <Text style={[typography.caption, styles.stepsProgress]}>
                {progress.done} of {progress.total} done
              </Text>
            </View>

            {JOB_STEPS.map((step, index) => (
              <StepRow
                key={step.key}
                index={index + 1}
                step={step}
                call={call}
                isCurrent={step.key === live.key}
                onPress={() => openStep(step)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const ActionRow: React.FC<{ label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = ({
  label,
  icon,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
  >
    <Text style={[typography.bodyStrong, styles.actionRowText]}>{label}</Text>
    <View style={styles.actionRowIcon}>
      <Ionicons name={icon} size={16} color={colors.textOnBrand} />
    </View>
  </Pressable>
);

const StepRow: React.FC<{
  index: number;
  step: JobStepDef;
  call: EngineerCall;
  isCurrent: boolean;
  onPress: () => void;
}> = ({ index, step, call, isCurrent, onPress }) => {
  const done = step.isDone(call);
  const unlocked = isStepUnlocked(call, step.key);

  return (
    <Pressable
      onPress={unlocked ? onPress : undefined}
      disabled={!unlocked}
      accessibilityRole="button"
      accessibilityLabel={`${step.title}${done ? ', done' : unlocked ? '' : ', locked'}`}
      accessibilityState={{ disabled: !unlocked }}
      style={({ pressed }) => [
        styles.stepRow,
        isCurrent && styles.stepRowCurrent,
        !unlocked && styles.stepRowLocked,
        pressed && unlocked && styles.stepRowPressed,
      ]}
    >
      <View style={[styles.stepBadge, done && styles.stepBadgeDone, isCurrent && styles.stepBadgeCurrent]}>
        {done ? (
          <Ionicons name="checkmark" size={15} color={colors.textOnBrand} />
        ) : (
          <Text style={[typography.caption, isCurrent ? styles.stepBadgeTextCurrent : styles.stepBadgeText]}>
            {index}
          </Text>
        )}
      </View>

      <View style={styles.stepText}>
        <Text style={[typography.bodyStrong, styles.stepTitle]} numberOfLines={1}>
          {step.title}
          {step.optional ? ' · optional' : ''}
        </Text>
        <Text style={[typography.caption, styles.stepHint]} numberOfLines={1}>
          {step.hint}
        </Text>
      </View>

      <Ionicons
        name={unlocked ? 'chevron-forward' : 'lock-closed'}
        size={16}
        color={unlocked ? colors.textFaint : colors.border}
      />
    </Pressable>
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  mutedTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  mutedText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.md,
    minWidth: 180,
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
  headerCallNumber: {
    color: colors.textMuted,
  },
  headerCustomer: {
    color: colors.text,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  machine: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  actionRowPressed: {
    opacity: 0.7,
  },
  actionRowText: {
    color: colors.brand,
  },
  actionRowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsBlock: {
    gap: spacing.sm,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsTitle: {
    color: colors.textMuted,
  },
  stepsProgress: {
    color: colors.textFaint,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepRowCurrent: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  stepRowLocked: {
    opacity: 0.55,
  },
  stepRowPressed: {
    opacity: 0.75,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: {
    backgroundColor: colors.success,
  },
  stepBadgeCurrent: {
    backgroundColor: colors.brand,
  },
  stepBadgeText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  stepBadgeTextCurrent: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    gap: 1,
  },
  stepTitle: {
    color: colors.text,
  },
  stepHint: {
    color: colors.textMuted,
  },
});
