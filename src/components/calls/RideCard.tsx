import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { capturePhoto } from '@/utils/imageCapture';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';
import {
  RIDE_MODES,
  RIDE_MODE_LABEL,
  RIDE_VEHICLE_LABEL,
  RIDE_VEHICLE_TYPES,
  type EngineerCall,
  type RideMode,
  type RideVehicleType,
} from '@/types/call';

interface RideCardProps {
  call: EngineerCall;
  onUpdated: (updated: EngineerCall) => void;
}

/**
 * The engineer's travel claim, recorded when they start the job.
 *
 * The fare is a claim, not a payment: it reaches their wallet only once the
 * office approves it. A pending or declined claim can be re-submitted to fix
 * a wrong fare or a bad photo; an approved one is frozen, because the money
 * has already moved.
 *
 * Unlike the photo capture in ProductVerificationCard, this one is NOT put
 * through the durable upload queue: the ride is a single all-or-nothing
 * submit (type + mode + fare + photo together), so a half-uploaded photo
 * with no fare behind it would be meaningless to retry on its own.
 */
export const RideCard: React.FC<RideCardProps> = ({ call, onUpdated }) => {
  const ride = call.ride;
  const approved = ride?.status === 'approved';
  const pending = ride?.status === 'pending';
  const declined = ride?.status === 'declined';

  const [vehicleType, setVehicleType] = useState<RideVehicleType>(ride?.vehicleType ?? '2W');
  const [mode, setMode] = useState<RideMode>(ride?.mode ?? 'public');
  const [fare, setFare] = useState(ride ? String(ride.fare) : '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A proof photo taken while the app was killed comes back here rather
  // than being lost, so the engineer does not have to shoot the bill twice.
  usePendingCapture('ride-proof', call._id, (dataUri) => {
    setPhotoUri(dataUri);
    setPhotoData(dataUri);
  });

  const takePhoto = async () => {
    try {
      await captureIntent.set({ purpose: 'ride-proof', callId: call._id });
      const photo = await capturePhoto();
      await captureIntent.clear();
      if (!photo) return;
      setError(null);
      setPhotoUri(photo.uri);
      setPhotoData(photo.dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That photo could not be read. Try again.');
    }
  };

  const submit = async () => {
    if (submitting) return;
    setError(null);

    const amount = Number(fare);
    if (!fare.trim() || !Number.isFinite(amount) || amount < 0) {
      setError('Enter the fare you paid.');
      return;
    }
    if (!photoData) {
      setError('Take a photo of the fare as proof.');
      return;
    }

    setSubmitting(true);
    try {
      onUpdated(await engineerCallsApi.recordRide(call._id, vehicleType, mode, amount, photoData));
      setPhotoUri(null);
      setPhotoData(null);
      setEditing(false);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not record the ride.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const summary = approved
    ? `Approved · ₹${ride?.fare}`
    : pending
      ? `₹${ride?.fare} · waiting for the office`
      : declined
        ? 'Declined by the office'
        : 'Not recorded yet';

  // Auto-expanded until there is a claim, and whenever one was declined —
  // both are states the engineer still has to act on.
  const showForm = editing || (!ride && !approved) || (declined && editing);

  return (
    <CollapsibleSection title="Your ride" summary={summary} defaultExpanded={!ride || declined}>
      {ride && !showForm ? (
        <View style={styles.block}>
          {approved ? (
            <Notice tone="success" message={`Approved — ₹${ride.fare} has been added to your wallet.`} />
          ) : pending ? (
            <Notice tone="info" message="Recorded. The office will approve the fare before it reaches your wallet." />
          ) : (
            <Notice
              tone="warning"
              message={ride.decisionNote || 'The office declined this travel claim.'}
            />
          )}

          <View style={styles.summaryRow}>
            <Detail label="Vehicle" value={RIDE_VEHICLE_LABEL[ride.vehicleType]} />
            <Detail label="Ride" value={RIDE_MODE_LABEL[ride.mode]} />
            <Detail label="Fare" value={`₹${ride.fare}`} />
          </View>

          {ride.photoUrl ? <Image source={{ uri: ride.photoUrl }} style={styles.proof} /> : null}

          {!approved ? (
            <Button
              label={declined ? 'Record again' : 'Change this'}
              variant="secondary"
              onPress={() => setEditing(true)}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={[typography.small, styles.intro]}>
            How did you travel to this job? The office approves the fare before it is added to your wallet.
          </Text>

          <ChipRow
            label="Vehicle"
            options={RIDE_VEHICLE_TYPES}
            selected={vehicleType}
            labelFor={(v) => RIDE_VEHICLE_LABEL[v]}
            onSelect={setVehicleType}
          />

          <ChipRow
            label="Private or public?"
            options={RIDE_MODES}
            selected={mode}
            labelFor={(m) => RIDE_MODE_LABEL[m]}
            onSelect={setMode}
          />

          <TextField
            label="Fare paid (₹)"
            value={fare}
            onChangeText={(t) => setFare(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
          />

          <View style={styles.photoBlock}>
            <Text style={[typography.label, styles.chipLabel]}>Photo proof *</Text>
            {photoUri ? (
              <Pressable onPress={() => void takePhoto()} accessibilityRole="button" accessibilityLabel="Retake photo">
                <Image source={{ uri: photoUri }} style={styles.proof} />
                <Text style={[typography.caption, styles.retake]}>Tap to retake</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void takePhoto()}
                accessibilityRole="button"
                accessibilityLabel="Take a photo of the fare"
                style={({ pressed }) => [styles.captureBox, pressed && styles.capturePressed]}
              >
                <Ionicons name="camera" size={22} color={colors.brand} />
                <Text style={[typography.caption, styles.captureText]}>Take photo</Text>
              </Pressable>
            )}
          </View>

          {error ? <Notice tone="error" message={error} /> : null}

          <View style={styles.actions}>
            {ride ? (
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setEditing(false);
                  setError(null);
                  setPhotoUri(null);
                  setPhotoData(null);
                }}
                style={styles.actionButton}
              />
            ) : null}
            <Button
              label="Save ride"
              loadingLabel="Saving…"
              onPress={submit}
              loading={submitting}
              style={styles.actionButton}
            />
          </View>

          {submitting ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        </View>
      )}
    </CollapsibleSection>
  );
};

function ChipRow<T extends string>({
  label,
  options,
  selected,
  labelFor,
  onSelect,
}: {
  label: string;
  options: T[];
  selected: T;
  labelFor: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.chipField}>
      <Text style={[typography.label, styles.chipLabel]}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[typography.caption, active ? styles.chipTextActive : styles.chipText]}>
                {labelFor(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detail}>
    <Text style={[typography.caption, styles.detailLabel]}>{label}</Text>
    <Text style={[typography.bodyStrong, styles.detailValue]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  intro: {
    color: colors.textMuted,
  },
  chipField: {
    gap: spacing.sm,
  },
  chipLabel: {
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  photoBlock: {
    gap: spacing.sm,
  },
  captureBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.sunken,
  },
  capturePressed: {
    opacity: 0.75,
  },
  captureText: {
    color: colors.brand,
    fontWeight: '700',
  },
  proof: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
  },
  retake: {
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  detail: {
    gap: 2,
  },
  detailLabel: {
    color: colors.textFaint,
  },
  detailValue: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
