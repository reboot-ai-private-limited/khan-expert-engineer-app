import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { StepScreen } from '@/components/calls/StepScreen';
import { ServiceLineEditor } from '@/components/calls/ServiceLineEditor';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { spacing } from '@/theme';
import type { EngineerCall, EngineerServiceLine } from '@/types/call';

/**
 * Step 7 — the bill: what the customer is charged, line by line.
 *
 * `closerCode` carries the total, which is where the rest of the CRM already
 * reads the collected amount from.
 */
export default function ChargesStepScreen() {
  return (
    <StepScreen stepKey="charges" canContinue={(call) => (call.engineerServices ?? []).length > 0}>
      {(call, applyUpdate) => <ChargesBody call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}

const ChargesBody: React.FC<{ call: EngineerCall; onUpdated: (c: EngineerCall) => void }> = ({ call, onUpdated }) => {
  const [services, setServices] = useState<EngineerServiceLine[]>(call.engineerServices ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaved(false);

    const clean = services
      .filter((s) => s.serviceName.trim().length > 0)
      .map((s) => ({ serviceName: s.serviceName.trim(), amount: Number(s.amount) || 0 }));

    if (clean.length === 0) {
      setError('Add at least one line. Use ₹0 if there is nothing to charge.');
      return;
    }

    setSaving(true);
    try {
      const total = clean.reduce((sum, s) => sum + s.amount, 0);
      const response = await engineerCallsApi.updateCall(call._id, {
        engineerServices: clean,
        closerCode: String(total),
      });
      onUpdated(response.call);
      setSaved(true);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Your charges were not saved — try again once you have signal.'
          : (serverMessage(err) ?? 'Could not save the charges. Try again.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.block}>
      <ServiceLineEditor value={services} onChange={setServices} />
      {error ? <Notice tone="error" message={error} /> : null}
      {saved ? <Notice tone="success" message="Charges saved." /> : null}
      <Button label="Save charges" loadingLabel="Saving…" onPress={save} loading={saving} />
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: spacing.lg,
  },
});
