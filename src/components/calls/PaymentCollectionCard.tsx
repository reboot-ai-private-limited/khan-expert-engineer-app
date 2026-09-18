import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { capturePhoto } from '@/utils/imageCapture';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { walletApi } from '@/api/endpoints/wallet';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';

interface PaymentCollectionCardProps {
  call: EngineerCall;
  onUpdated: (call: EngineerCall) => void;
}

type Mode = 'cash' | 'upi' | 'mixed';

/**
 * Payment collection at the job — the last step before completion, per
 * mobile/docs/specs/06-job-execution.md rule 6 and 08-wallet-and-payments.md.
 * Posts straight to the engineer's wallet ledger (commission stays a
 * separate admin-only figure, entered later).
 */
export const PaymentCollectionCard: React.FC<PaymentCollectionCardProps> = ({ call, onUpdated }) => {
  const [mode, setMode] = useState<Mode>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');
  const [onlineReference, setOnlineReference] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const [qrUri, setQrUri] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showQr = async () => {
    setQrLoading(true);
    setError(null);
    try {
      const { upiUri } = await walletApi.getPaymentQr(Number(onlineAmount) || undefined, `Job ${call.callNumber}`);
      setQrUri(upiUri);
    } catch (err) {
      setError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not load the payment QR.'));
    } finally {
      setQrLoading(false);
    }
  };

  const captureScreenshot = async () => {
    try {
      const photo = await capturePhoto();
      if (photo) setScreenshot(photo.dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not take that photo.');
    }
  };

  const submit = async () => {
    setError(null);
    const cash = mode === 'upi' ? 0 : Number(cashAmount) || 0;
    const online = mode === 'cash' ? 0 : Number(onlineAmount) || 0;
    if (cash <= 0 && online <= 0) {
      setError('Enter at least one amount.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await engineerCallsApi.submitPaymentCollection(call._id, {
        cashAmount: cash,
        onlineAmount: online,
        onlineReference: online > 0 ? onlineReference.trim() || undefined : undefined,
        screenshotBase64: online > 0 ? screenshot ?? undefined : undefined,
      });
      onUpdated(updated);
    } catch (err) {
      setError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not record the payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (call.paymentCollected) {
    return (
      <CollapsibleSection title="Payment" summary="Recorded">
        <Notice tone="success" message="Payment has been recorded for this job." />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Payment" summary="Not recorded yet — tap to collect payment" defaultExpanded>
      <View style={styles.modeRow}>
        {(['cash', 'upi', 'mixed'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
            <Text style={[typography.small, mode === m ? styles.modeTextActive : styles.modeText]}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {mode !== 'upi' ? (
        <TextField label="Cash amount (₹)" value={cashAmount} onChangeText={(t) => setCashAmount(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
      ) : null}

      {mode !== 'cash' ? (
        <>
          <TextField
            label="Online amount (₹)"
            value={onlineAmount}
            onChangeText={(t) => {
              setOnlineAmount(t.replace(/[^0-9]/g, ''));
              // The QR bakes the amount in — a stale one showing the old
              // figure would have the customer pay the wrong amount, so
              // any edit invalidates it and the engineer must regenerate.
              setQrUri(null);
            }}
            keyboardType="number-pad"
          />
          {!qrUri ? (
            <Button label="Show payment QR" variant="secondary" onPress={showQr} loading={qrLoading} />
          ) : (
            <View style={styles.qrBox}>
              <QRCode value={qrUri} size={180} color={colors.text} backgroundColor={colors.surface} />
              <Text style={[typography.caption, styles.qrHint]}>Customer scans to pay the company directly.</Text>
              <Button label="Refresh QR" variant="secondary" onPress={showQr} loading={qrLoading} />
            </View>
          )}
          <TextField label="UPI reference (optional)" value={onlineReference} onChangeText={setOnlineReference} placeholder="Txn ID" />
          {screenshot ? (
            <Notice tone="success" message="Payment screenshot attached." />
          ) : (
            <Button label="Attach payment screenshot (optional)" variant="secondary" onPress={captureScreenshot} />
          )}
        </>
      ) : null}

      {error ? <Notice tone="error" message={error} /> : null}
      <Button label="Record payment" loadingLabel="Saving…" onPress={submit} loading={submitting} />
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  qrBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  qrHint: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
