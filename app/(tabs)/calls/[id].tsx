import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobStatusesApi, type JobStatusOption } from '@/api/endpoints/jobStatuses';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { serviceTypesApi } from '@/api/endpoints/serviceTypes';
import { isNetworkError, serverMessage } from '@/api/client';
import { CheckInOutCard } from '@/components/calls/CheckInOutCard';
import { InfoRow } from '@/components/calls/InfoRow';
import { PhotoGrid } from '@/components/calls/PhotoGrid';
import { ServiceLineEditor } from '@/components/calls/ServiceLineEditor';
import { StatusPill } from '@/components/calls/StatusPill';
import { StepChecklist, type StepInput } from '@/components/calls/StepChecklist';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerServiceLine, ServiceImage, ServiceStep } from '@/types/call';

/** Shown if the sub-status master can't be reached — same wording as the web fallback. */
const FALLBACK_SUB_STATUSES = [
  'In Progress',
  'Attended',
  'Pending Parts',
  'Job Done',
  'Work Completed',
  'Customer Rescheduled',
  'Customer Refused',
];

const isCancelLike = (text: string): boolean => {
  const t = text.toLowerCase();
  return t.includes('cancel') || t.includes('refuse');
};

const isCompletingLike = (text: string): boolean => {
  const t = text.toLowerCase();
  return t.includes('job done') || t.includes('work completed') || t === 'completed';
};

const isLocked = (jobStatus: string, subStatus: string | undefined): boolean => {
  const s = [jobStatus, subStatus ?? ''].map((v) => v.trim().toLowerCase());
  return s.some((v) => v === 'job done' || v === 'completed' || v === 'work completed' || v === 'closed');
};

export default function CallDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { calls, loading, getById, refresh, applyUpdate } = useCalls();

  const call = getById(id);

  const [subStatusOptions, setSubStatusOptions] = useState<string[]>(FALLBACK_SUB_STATUSES);
  const [subStatus, setSubStatus] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [services, setServices] = useState<EngineerServiceLine[]>([]);
  const [serviceImages, setServiceImages] = useState<ServiceImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceSteps, setServiceSteps] = useState<ServiceStep[]>([]);
  const [stepInputs, setStepInputs] = useState<Record<number, StepInput>>({});

  // A cold deep-link (or a stale list) may not have this call yet.
  useEffect(() => {
    if (!call && calls.length === 0 && !loading) {
      void refresh(false);
    }
  }, [call, calls.length, loading, refresh]);

  // Seed the form once the call is available.
  useEffect(() => {
    if (!call) return;
    setSubStatus(call.subStatus ?? '');
    setSerialNumber(call.serialNumber ?? '');
    setRemarks(call.remarks ?? '');
    setCancelReason(call.cancelReason ?? '');
    setServices(call.engineerServices?.length ? call.engineerServices : []);
    setServiceImages(call.service_images ?? []);

    const seededInputs: Record<number, StepInput> = {};
    (call.stepResults ?? []).forEach((s) => {
      seededInputs[s.order] = { notes: s.notes ?? '', amount: s.amount !== undefined ? String(s.amount) : '' };
    });
    setStepInputs(seededInputs);
  }, [call?._id]);

  useEffect(() => {
    if (!call?.serviceType) {
      setServiceSteps([]);
      return;
    }
    let cancelled = false;
    serviceTypesApi
      .getStepsForServiceType(call.serviceType)
      .then((steps) => {
        if (!cancelled) setServiceSteps(steps);
      })
      .catch(() => {
        if (!cancelled) setServiceSteps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [call?.serviceType]);

  const updateStepInput = (order: number, patch: Partial<StepInput>) => {
    setStepInputs((prev) => ({ ...prev, [order]: { ...(prev[order] ?? { notes: '', amount: '' }), ...patch } }));
  };

  useEffect(() => {
    let cancelled = false;
    jobStatusesApi
      .getSubStatusOptions()
      .then((options: JobStatusOption[]) => {
        if (!cancelled && options.length > 0) {
          setSubStatusOptions(options.map((o) => o.name));
        }
      })
      .catch(() => {
        // Fallback list already set — this master is not critical enough to block the screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePhotosChange = (next: ServiceImage[]) => {
    setServiceImages(next);
    if (call) applyUpdate({ ...call, service_images: next });
  };

  const callCustomer = () => {
    if (!call?.contactNumber) return;
    void Linking.openURL(`tel:${call.contactNumber}`);
  };

  const handleSubmit = async () => {
    if (!call) return;
    setFormError(null);

    if (!subStatus.trim()) {
      setFormError('Select what happened on this visit.');
      return;
    }
    if (isCancelLike(subStatus) && !cancelReason.trim()) {
      setFormError('A reason is required when reporting a cancellation or refusal.');
      return;
    }
    if (isCompletingLike(subStatus) && !call.checkOut) {
      setFormError('Check out (GPS location) before marking this job complete.');
      return;
    }

    const cleanServices = services
      .filter((s) => s.serviceName.trim().length > 0)
      .map((s) => ({ serviceName: s.serviceName.trim(), amount: Number(s.amount) || 0 }));
    const total = cleanServices.reduce((sum, s) => sum + s.amount, 0);

    setSubmitting(true);
    try {
      if (serviceSteps.length > 0) {
        const steps = serviceSteps.map((s) => {
          const input = stepInputs[s.order] ?? { notes: '', amount: '' };
          return {
            order: s.order,
            label: s.label,
            notes: input.notes.trim(),
            amount: s.requiresAmount && input.amount ? Number(input.amount) : undefined,
            completedAt: input.notes.trim() ? new Date().toISOString() : undefined,
          };
        });
        await engineerCallsApi.updateSteps(call._id, steps);
      }

      const response = await engineerCallsApi.updateCall(call._id, {
        subStatus: subStatus.trim(),
        remarks: remarks.trim(),
        serialNumber: serialNumber.trim(),
        cancelReason: cancelReason.trim(),
        engineerServices: cleanServices,
        closerCode: String(total),
      });
      applyUpdate(response.call);
      router.back();
      // The summary tiles are server-computed counts, not derived from the
      // list in memory — refresh them quietly now that a status changed.
      void refresh(true);
    } catch (error) {
      const message = isNetworkError(error)
        ? 'Could not reach the server. Your changes were not saved — try again once you have signal.'
        : (serverMessage(error) ?? 'Could not save this update. Try again.');
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

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

  const locked = isLocked(call.jobStatus, call.subStatus);
  const machine = [call.brandName, call.productsName].filter(Boolean).join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Job summary — read-only */}
        <View style={styles.card}>
          {machine ? <Text style={[typography.bodyStrong, styles.machine]}>{machine}</Text> : null}
          <InfoRow label="Model" value={call.modelNumber} />
          <InfoRow label="Service type" value={call.serviceType} />
          <InfoRow label="Address" value={call.address} />
          <InfoRow label="Pincode" value={call.pincode} />
          <InfoRow label="Warranty" value={call.warrantyTerms} />

          {!locked ? (
            <Pressable
              onPress={() => router.push({ pathname: '/id-card/[callId]', params: { callId: call._id } })}
              accessibilityRole="button"
              accessibilityLabel="Show ID card"
              style={({ pressed }) => [styles.callRow, pressed && styles.callRowPressed]}
            >
              <Text style={[typography.bodyStrong, styles.callRowText]}>Show ID card</Text>
              <View style={styles.callRowIcon}>
                <Ionicons name="card" size={16} color={colors.textOnBrand} />
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={callCustomer}
            accessibilityRole="button"
            accessibilityLabel={`Call ${call.customerName}`}
            style={({ pressed }) => [styles.callRow, pressed && styles.callRowPressed]}
          >
            <Text style={[typography.bodyStrong, styles.callRowText]}>Call {call.contactNumber}</Text>
            <View style={styles.callRowIcon}>
              <Ionicons name="call" size={16} color={colors.textOnBrand} />
            </View>
          </Pressable>
        </View>

        {locked ? (
          <Notice
            tone="info"
            message="This job is marked done and is locked."
            action="Contact the office if something needs to change."
          />
        ) : (
          <>
            <CheckInOutCard call={call} onUpdated={applyUpdate} />

            {formError ? <Notice tone="error" message={formError} /> : null}

            {!call.checkIn ? null : (
            <>
            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Serial number</Text>
              <TextField
                label="Device serial number"
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Read from the back or bottom label"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.section}>
              <SelectField
                label="What happened on this visit"
                value={subStatus}
                options={subStatusOptions}
                onChange={setSubStatus}
                placeholder="Select an outcome…"
              />
            </View>

            {isCancelLike(subStatus) ? (
              <View style={styles.section}>
                <TextField
                  label="Reason"
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Why the customer refused, or why the job was cancelled"
                  multiline
                  numberOfLines={3}
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Services & amount collected</Text>
              <ServiceLineEditor value={services} onChange={setServices} />
            </View>

            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Photos</Text>
              <PhotoGrid callId={call._id} images={serviceImages} onImagesChange={handlePhotosChange} />
            </View>

            {serviceSteps.length > 0 ? (
              <View style={styles.section}>
                <Text style={[typography.label, styles.sectionLabel]}>Job steps</Text>
                <StepChecklist
                  steps={serviceSteps}
                  values={stepInputs}
                  onChange={updateStepInput}
                  hasPhoto={serviceImages.length > 0}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <TextField
                  label="Remarks"
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="What you found, what you did, anything the office should know"
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            <Button
              label="Save update"
              loadingLabel="Saving…"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submit}
            />
            </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  },
  mutedText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.md,
    minWidth: 160,
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
  },
  headerCallNumber: {
    color: colors.textFaint,
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
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
  },
  machine: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  callRowPressed: {
    opacity: 0.7,
  },
  callRowText: {
    color: colors.brand,
  },
  callRowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  submit: {
    marginTop: spacing.md,
  },
});
