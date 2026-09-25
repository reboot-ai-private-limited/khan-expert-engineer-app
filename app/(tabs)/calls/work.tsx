import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { serviceTypesApi } from '@/api/endpoints/serviceTypes';
import { isNetworkError, serverMessage } from '@/api/client';
import { StepScreen } from '@/components/calls/StepScreen';
import { StepChecklist, type StepInput } from '@/components/calls/StepChecklist';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { colors, spacing, typography } from '@/theme';
import { isOfficeSet } from '@/utils/identityLock';
import { hasWorkRecorded } from '@/utils/jobSteps';
import type { EngineerCall, ServiceStep } from '@/types/call';

/**
 * Step 4 — what was actually done on the visit.
 *
 * Uses the service type's configured checklist when it has one, and falls
 * back to a single remarks box when it does not. Saves only this step's
 * slice; the job is not completed here, that happens on the job sheet.
 */
export default function WorkStepScreen() {
  return (
    // Same rule the later required steps check (jobSteps.ts) — so Next only
    // appears once they will actually open, instead of letting the engineer
    // walk through Spares and Photos and hit a wall at Charges.
    <StepScreen stepKey="work" canContinue={hasWorkRecorded}>
      {(call, applyUpdate) => <WorkBody call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}

const WorkBody: React.FC<{ call: EngineerCall; onUpdated: (c: EngineerCall) => void }> = ({ call, onUpdated }) => {
  const [serviceSteps, setServiceSteps] = useState<ServiceStep[]>([]);
  const [stepInputs, setStepInputs] = useState<Record<number, StepInput>>({});
  const [remarks, setRemarks] = useState(call.remarks ?? '');
  const [serialNumber, setSerialNumber] = useState(call.serialNumber ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const seeded: Record<number, StepInput> = {};
    (call.stepResults ?? []).forEach((s) => {
      seeded[s.order] = { notes: s.notes ?? '', amount: s.amount !== undefined ? String(s.amount) : '' };
    });
    setStepInputs(seeded);
  }, [call._id]);

  useEffect(() => {
    if (!call.serviceType) {
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
  }, [call.serviceType]);

  const updateStepInput = (order: number, patch: Partial<StepInput>) => {
    setStepInputs((prev) => ({ ...prev, [order]: { ...(prev[order] ?? { notes: '', amount: '' }), ...patch } }));
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaved(false);

    const usingChecklist = serviceSteps.length > 0;
    if (!usingChecklist && !remarks.trim()) {
      setError('Write what you did on this visit.');
      return;
    }
    // A checklist saved with every step blank records no work, and the job
    // cannot move on without some.
    if (usingChecklist && !serviceSteps.some((s) => (stepInputs[s.order]?.notes ?? '').trim()) && !remarks.trim()) {
      setError('Fill in at least one step with what you did.');
      return;
    }

    setSaving(true);
    try {
      if (usingChecklist) {
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
        remarks: remarks.trim(),
        // Omitted when the office owns it — the server would refuse the write,
        // and relying on the value happening to be unchanged is fragile.
        ...(isOfficeSet(call, 'serialNumber') ? {} : { serialNumber: serialNumber.trim() }),
      });
      onUpdated(response.call);
      setSaved(true);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Your changes were not saved — try again once you have signal.'
          : (serverMessage(err) ?? 'Could not save this step. Try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  const hasPhoto = (call.service_images ?? []).length > 0;

  return (
    <View style={styles.block}>
      {serviceSteps.length > 0 ? (
        <StepChecklist steps={serviceSteps} values={stepInputs} onChange={updateStepInput} hasPhoto={hasPhoto} />
      ) : (
        <TextField
          label="What did you do?"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Describe the work carried out"
          multiline
        />
      )}

      {/* Only offered when the office has not set it. The full set of
          identity fields, locked or not, lives on the Check SR
          step next to the nameplate photo. */}
      {isOfficeSet(call, 'serialNumber') ? null : (
        <TextField
          label="Device serial number"
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder="From the nameplate"
          autoCapitalize="characters"
        />
      )}

      {error ? <Notice tone="error" message={error} /> : null}
      {saved ? <Notice tone="success" message="Saved." /> : null}

      <Button label="Save work" loadingLabel="Saving…" onPress={save} loading={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: spacing.lg,
  },
  hint: {
    color: colors.textFaint,
    marginTop: -spacing.sm,
  },
});
