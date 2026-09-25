import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { StepScreen } from '@/components/calls/StepScreen';
import { ServiceLineEditor } from '@/components/calls/ServiceLineEditor';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { spacing } from '@/theme';
import {
  WARRANTY_CHARGE_REASONS,
  WARRANTY_CHARGE_REASON_LABEL,
  isUnderWarranty,
  type EngineerCall,
  type EngineerServiceLine,
  type WarrantyChargeReason,
} from '@/types/call';

/**
 * Step 7 — the bill: what the customer is charged, line by line.
 *
 * `closerCode` carries the total, which is where the rest of the CRM already
 * reads the collected amount from.
 *
 * A job under warranty starts at ₹0. Charging it anything needs a reason
 * (damage, consumables, a part the warranty does not cover…), which the
 * server enforces and the office sees on the ticket.
 */
export default function ChargesStepScreen() {
  return (
    <StepScreen stepKey="charges" canContinue={(call) => (call.engineerServices ?? []).length > 0}>
      {(call, applyUpdate) => <ChargesBody call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}

const PICK_REASON = 'Choose a reason';

const ChargesBody: React.FC<{ call: EngineerCall; onUpdated: (c: EngineerCall) => void }> = ({ call, onUpdated }) => {
  const warranty = isUnderWarranty(call);

  const [services, setServices] = useState<EngineerServiceLine[]>(() => {
    if ((call.engineerServices ?? []).length > 0) return call.engineerServices!;
    // A fresh warranty bill starts as one free line, so ₹0 is the default.
    return warranty ? [{ serviceName: 'Warranty service', amount: 0 }] : [];
  });
  const [reason, setReason] = useState<WarrantyChargeReason | null>(call.warrantyChargeReason ?? null);
  const [reasonNote, setReasonNote] = useState(call.warrantyChargeNote ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const chargingWarranty = warranty && total > 0;

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

    const cleanTotal = clean.reduce((sum, s) => sum + s.amount, 0);
    if (warranty && cleanTotal > 0) {
      if (!reason) {
        setError('This job is under warranty. Choose why the customer is being charged.');
        return;
      }
      if (reason === 'other' && !reasonNote.trim()) {
        setError('Describe why the customer is being charged.');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await engineerCallsApi.updateCall(call._id, {
        engineerServices: clean,
        closerCode: String(cleanTotal),
        ...(warranty && cleanTotal > 0
          ? { warrantyChargeReason: reason!, warrantyChargeNote: reasonNote.trim() }
          : {}),
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
      {warranty ? (
        <Notice
          tone={chargingWarranty ? 'warning' : 'success'}
          message={
            chargingWarranty
              ? 'This job is under warranty, but you are charging the customer.'
              : 'This job is under warranty — no charge for labour or covered parts.'
          }
          action={
            chargingWarranty
              ? 'Choose the reason below. The office will see it.'
              : 'Only add a charge for something the warranty does not cover.'
          }
        />
      ) : null}

      <ServiceLineEditor value={services} onChange={setServices} />

      {chargingWarranty ? (
        <>
          <SelectField
            label="Why is the customer paying?"
            value={reason ? WARRANTY_CHARGE_REASON_LABEL[reason] : PICK_REASON}
            options={WARRANTY_CHARGE_REASONS.map((r) => WARRANTY_CHARGE_REASON_LABEL[r])}
            onChange={(label) => {
              const match = WARRANTY_CHARGE_REASONS.find((r) => WARRANTY_CHARGE_REASON_LABEL[r] === label);
              if (match) setReason(match);
            }}
          />
          <TextField
            label={reason === 'other' ? 'Describe the reason' : 'Details (optional)'}
            value={reasonNote}
            onChangeText={setReasonNote}
            placeholder="e.g. Burnt PCB from a voltage spike"
            multiline
          />
        </>
      ) : null}

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
