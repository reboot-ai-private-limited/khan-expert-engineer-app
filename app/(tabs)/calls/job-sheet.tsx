import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { jobStatusesApi, type JobStatusOption } from '@/api/endpoints/jobStatuses';
import { isNetworkError, serverMessage } from '@/api/client';
import { StepScreen } from '@/components/calls/StepScreen';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { COMPANY } from '@/constants/company';
import { colors, radius, spacing, typography } from '@/theme';
import { RIDE_MODE_LABEL, RIDE_VEHICLE_LABEL, type EngineerCall } from '@/types/call';

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

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Step 11 — the job sheet.
 *
 * Everything gathered across the visit, on one page, built from the ticket
 * rather than re-typed: product, work, parts, charges, travel, payment and
 * the customer's signature. This is the last screen before the job is
 * submitted, so it doubles as the engineer's final check.
 */
export default function JobSheetStepScreen() {
  return (
    <StepScreen stepKey="job-sheet" footer={() => null}>
      {(call, applyUpdate) => <JobSheetBody call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}

const JobSheetBody: React.FC<{ call: EngineerCall; onUpdated: (c: EngineerCall) => void }> = ({
  call,
  onUpdated,
}) => {
  const { refresh } = useCalls();

  const [subStatusOptions, setSubStatusOptions] = useState<string[]>(FALLBACK_SUB_STATUSES);
  const [subStatus, setSubStatus] = useState(call.subStatus ?? '');
  const [cancelReason, setCancelReason] = useState(call.cancelReason ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  /**
   * Opens the printable sheet. The PDF is rendered server-side and opened in
   * whatever handles PDFs on the phone, from where it can be shared or sent
   * to the customer — rather than trying to draw a print layout in RN.
   */
  const openJobSheet = async () => {
    if (sheetBusy) return;
    setSheetError(null);
    setSheetBusy(true);
    try {
      await Linking.openURL(await engineerCallsApi.getJobSheet(call._id));
    } catch (err) {
      setSheetError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not build the job sheet.')
      );
    } finally {
      setSheetBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    jobStatusesApi
      .getSubStatusOptions()
      .then((options: JobStatusOption[]) => {
        if (!cancelled && options.length > 0) setSubStatusOptions(options.map((o) => o.name));
      })
      .catch(() => {
        // The fallback list above is the same one the web CRM falls back to.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const services = call.engineerServices ?? [];
  const total = services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const steps = (call.stepResults ?? []).filter((s) => (s.notes ?? '').trim().length > 0);
  const photos = call.service_images ?? [];

  const submit = async () => {
    if (submitting) return;
    setError(null);

    if (!subStatus.trim()) {
      setError('Select what happened on this visit.');
      return;
    }
    if (isCancelLike(subStatus) && !cancelReason.trim()) {
      setError('A reason is required when reporting a cancellation or refusal.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await engineerCallsApi.updateCall(call._id, {
        subStatus: subStatus.trim(),
        cancelReason: cancelReason.trim(),
      });
      onUpdated(response.call);
      // The tiles are server-computed counts, not derived from the list in
      // memory — refresh them quietly now that a status has changed.
      void refresh(true);
      router.dismissAll();
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Nothing was submitted — try again once you have signal.'
          : (serverMessage(err) ?? 'Could not submit this job. Try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.block}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={[typography.bodyStrong, styles.company]}>{COMPANY.name}</Text>
          <Text style={[typography.caption, styles.muted]}>{COMPANY.mobile}</Text>
          <Text style={[typography.title, styles.jobNumber]}>{call.callNumber}</Text>
        </View>

        <Section title="Customer">
          <Row label="Name" value={call.customerName} />
          <Row label="Address" value={[call.address, call.pincode].filter(Boolean).join(', ')} />
        </Section>

        <Section title="Product">
          <Row label="Unit" value={[call.brandName, call.productsName].filter(Boolean).join(' · ')} />
          <Row label="Model" value={call.modelNumber} />
          <Row label="Serial" value={call.serialNumber} />
          <Row label="Capacity" value={call.capacity} />
          <Row label="Warranty" value={call.warrantyStatus?.replace(/_/g, ' ')} />
        </Section>

        <Section title="Work done">
          {steps.length > 0 ? (
            steps.map((s) => <Row key={s.order} label={s.label} value={s.notes} />)
          ) : (
            <Row label="Notes" value={call.remarks} />
          )}
        </Section>

        <Section title="Charges">
          {services.length > 0 ? (
            <>
              {services.map((s, i) => (
                <Row key={`${s.serviceName}-${i}`} label={s.serviceName} value={money(Number(s.amount) || 0)} />
              ))}
              <View style={styles.totalRow}>
                <Text style={[typography.bodyStrong, styles.totalLabel]}>Total</Text>
                <Text style={[typography.bodyStrong, styles.totalValue]}>{money(total)}</Text>
              </View>
            </>
          ) : (
            <Text style={[typography.caption, styles.muted]}>Nothing charged.</Text>
          )}
        </Section>

        {(call.selfPurchasedParts ?? []).length > 0 ? (
          <Section title="Parts bought by the engineer">
            {(call.selfPurchasedParts ?? []).map((part) => (
              <Row
                key={part._id}
                label={`${part.partName}${part.quantity > 1 ? ` ×${part.quantity}` : ''}`}
                value={`paid ${money(part.amountPaid * part.quantity)} · ${part.status}`}
              />
            ))}
          </Section>
        ) : null}

        {call.ride ? (
          <Section title="Travel">
            <Row
              label="Ride"
              value={`${RIDE_MODE_LABEL[call.ride.mode]} · ${RIDE_VEHICLE_LABEL[call.ride.vehicleType]}`}
            />
            <Row label="Car number" value={`${call.ride.carNumber} (${call.ride.status})`} />
          </Section>
        ) : null}

        <Section title="Payment">
          <Row label="Collected" value={call.paymentCollected ? 'Yes' : 'Not recorded'} />
        </Section>

        {call.customerSignature ? (
          <Section title="Customer signature">
            <View style={styles.signatureBox}>
              <Svg
                width="100%"
                height={90}
                viewBox={`0 0 ${call.customerSignature.width} ${call.customerSignature.height}`}
              >
                <Path
                  d={call.customerSignature.pathData}
                  stroke={colors.text}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </Section>
        ) : null}

        {photos.length > 0 ? (
          <Section title="Photos">
            <View style={styles.photoRow}>
              {photos.slice(0, 6).map((img) => (
                <Image key={img.public_id} source={{ uri: img.secure_url }} style={styles.thumb} />
              ))}
            </View>
          </Section>
        ) : null}
      </View>

      {sheetBusy ? (
        <View style={styles.sheetBusy}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={[typography.caption, styles.muted]}>Building the sheet…</Text>
        </View>
      ) : (
        <Button label="Open printable job sheet (PDF)" variant="secondary" onPress={openJobSheet} />
      )}

      {sheetError ? <Notice tone="error" message={sheetError} /> : null}

      <SelectField
        label="What happened on this visit?"
        value={subStatus}
        options={subStatusOptions}
        onChange={setSubStatus}
      />

      {isCancelLike(subStatus) ? (
        <TextField
          label="Reason"
          value={cancelReason}
          onChangeText={setCancelReason}
          placeholder="Why could the job not be completed?"
          multiline
        />
      ) : null}

      {error ? <Notice tone="error" message={error} /> : null}

      <Button label="Finish job" loadingLabel="Submitting…" onPress={submit} loading={submitting} />
    </View>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={[typography.label, styles.sectionTitle]}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const Row: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? (
    <View style={styles.row}>
      <Text style={[typography.caption, styles.rowLabel]}>{label}</Text>
      <Text style={[typography.small, styles.rowValue]}>{value}</Text>
    </View>
  ) : null;

const styles = StyleSheet.create({
  block: {
    gap: spacing.lg,
  },
  sheetBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sheetHeader: {
    gap: 2,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  company: {
    color: colors.text,
  },
  jobNumber: {
    color: colors.brand,
    marginTop: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textFaint,
  },
  sectionBody: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    color: colors.textMuted,
    flexShrink: 0,
  },
  rowValue: {
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  totalLabel: {
    color: colors.text,
  },
  totalValue: {
    color: colors.brand,
  },
  signatureBox: {
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.sunken,
  },
});
