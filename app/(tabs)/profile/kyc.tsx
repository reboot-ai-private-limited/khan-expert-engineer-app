import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { kycApi } from '@/api/endpoints/kyc';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { PhotoSlot } from '@/components/kyc/PhotoSlot';
import { StatusBadge } from '@/components/kyc/StatusBadge';
import { colors, radius, spacing, typography } from '@/theme';
import type { AadhaarKycSummary, KycSummary, PanKycSummary } from '@/types/kyc';

export default function KycDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const [kyc, setKyc] = useState<KycSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setKyc(await kycApi.getMine());
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not load your documents.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>KYC documents</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        <Text style={[typography.small, styles.intro]}>
          Used to verify who you are before you can be issued a job ID card. Your Aadhaar number is stored
          encrypted and only ever shown to you masked.
        </Text>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : error ? (
          <>
            <Notice tone="error" message={error} />
            <Button label="Try again" variant="secondary" onPress={() => void load()} />
          </>
        ) : kyc ? (
          <>
            <AadhaarSection summary={kyc.aadhaar} onUploaded={(next) => setKyc((k) => (k ? { ...k, aadhaar: next.aadhaar } : k))} />
            <PanSection summary={kyc.pan} onUploaded={(next) => setKyc((k) => (k ? { ...k, pan: next.pan } : k))} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const AadhaarSection: React.FC<{
  summary: AadhaarKycSummary;
  onUploaded: (kyc: KycSummary) => void;
}> = ({ summary, onUploaded }) => {
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState('');
  const [name, setName] = useState(summary.nameOnDocument);
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const digits = number.replace(/\D/g, '');
    if (digits.length !== 12) {
      setFormError('Enter the 12-digit Aadhaar number.');
      return;
    }
    if (!front || !back) {
      setFormError('Both the front and back photo are required.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await kycApi.uploadAadhaar({
        number: digits,
        nameOnDocument: name.trim() || undefined,
        frontImageBase64: front,
        backImageBase64: back,
      });
      onUploaded({ aadhaar: next.aadhaar, pan: next.pan });
      setEditing(false);
      setNumber('');
      setFront(null);
      setBack(null);
    } catch (err) {
      setFormError(isNetworkError(err) ? 'Could not reach the server.' : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[typography.bodyStrong, styles.cardTitle]}>Aadhaar card</Text>
        <StatusBadge status={summary.status} />
      </View>

      {summary.maskedNumber ? (
        <Text style={[typography.body, styles.savedValue]}>{summary.maskedNumber}</Text>
      ) : null}
      {summary.nameOnDocument ? (
        <Text style={[typography.small, styles.savedSubtext]}>{summary.nameOnDocument}</Text>
      ) : null}
      {summary.status === 'rejected' && summary.rejectionReason ? (
        <Notice tone="error" message={summary.rejectionReason} />
      ) : null}

      {!editing ? (
        <Button
          label={summary.status === 'not_uploaded' ? 'Upload Aadhaar' : 'Replace / re-upload'}
          variant={summary.status === 'not_uploaded' ? 'primary' : 'secondary'}
          onPress={() => setEditing(true)}
        />
      ) : (
        <View style={styles.form}>
          {formError ? <Notice tone="error" message={formError} /> : null}
          {summary.status === 'verified' ? (
            <Notice tone="warning" message="Re-uploading replaces the verified document and sends it back for review." />
          ) : null}
          <TextField
            label="Aadhaar number"
            value={number}
            onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 12))}
            keyboardType="number-pad"
            placeholder="12-digit number"
          />
          <TextField label="Name on the card" value={name} onChangeText={setName} />
          <PhotoSlot label="Front" value={front} onChange={setFront} recoveryId="kyc-aadhaar-front" />
          <PhotoSlot label="Back" value={back} onChange={setBack} recoveryId="kyc-aadhaar-back" />
          <View style={styles.formActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.formButton} />
            <Button
              label="Submit"
              loadingLabel="Uploading…"
              loading={submitting}
              onPress={submit}
              style={styles.formButton}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const PanSection: React.FC<{
  summary: PanKycSummary;
  onUploaded: (kyc: KycSummary) => void;
}> = ({ summary, onUploaded }) => {
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState('');
  const [name, setName] = useState(summary.nameOnDocument);
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const clean = number.trim().toUpperCase();
    if (!PAN_PATTERN.test(clean)) {
      setFormError('Enter a valid PAN, e.g. ABCDE1234F.');
      return;
    }
    if (!image) {
      setFormError('A photo of the PAN card is required.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await kycApi.uploadPan({ number: clean, nameOnDocument: name.trim() || undefined, imageBase64: image });
      onUploaded({ aadhaar: next.aadhaar, pan: next.pan });
      setEditing(false);
      setNumber('');
      setImage(null);
    } catch (err) {
      setFormError(isNetworkError(err) ? 'Could not reach the server.' : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[typography.bodyStrong, styles.cardTitle]}>PAN card</Text>
        <StatusBadge status={summary.status} />
      </View>

      {summary.number ? <Text style={[typography.body, styles.savedValue]}>{summary.number}</Text> : null}
      {summary.nameOnDocument ? (
        <Text style={[typography.small, styles.savedSubtext]}>{summary.nameOnDocument}</Text>
      ) : null}
      {summary.status === 'rejected' && summary.rejectionReason ? (
        <Notice tone="error" message={summary.rejectionReason} />
      ) : null}

      {!editing ? (
        <Button
          label={summary.status === 'not_uploaded' ? 'Upload PAN' : 'Replace / re-upload'}
          variant={summary.status === 'not_uploaded' ? 'primary' : 'secondary'}
          onPress={() => setEditing(true)}
        />
      ) : (
        <View style={styles.form}>
          {formError ? <Notice tone="error" message={formError} /> : null}
          {summary.status === 'verified' ? (
            <Notice tone="warning" message="Re-uploading replaces the verified document and sends it back for review." />
          ) : null}
          <TextField
            label="PAN number"
            value={number}
            onChangeText={(t) => setNumber(t.toUpperCase().slice(0, 10))}
            autoCapitalize="characters"
            placeholder="ABCDE1234F"
          />
          <TextField label="Name on the card" value={name} onChangeText={setName} />
          <PhotoSlot label="PAN card photo" value={image} onChange={setImage} recoveryId="kyc-pan-photo" />
          <View style={styles.formActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.formButton} />
            <Button
              label="Submit"
              loadingLabel="Uploading…"
              loading={submitting}
              onPress={submit}
              style={styles.formButton}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerTitle: {
    color: colors.text,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  intro: {
    color: colors.textMuted,
  },
  centerBlock: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
  },
  savedValue: {
    color: colors.text,
    fontWeight: '600',
  },
  savedSubtext: {
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formButton: {
    flex: 1,
  },
});
