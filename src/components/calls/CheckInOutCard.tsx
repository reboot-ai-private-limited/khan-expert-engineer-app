import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { compressAsset } from '@/utils/imageCapture';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import * as Location from 'expo-location';
import { Image, StyleSheet, Text, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';

interface CheckInOutCardProps {
  call: EngineerCall;
  onUpdated: (call: EngineerCall) => void;
}

const IMAGE_QUALITY = 0.5;

const formatTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '');

const getGpsFix = async (): Promise<Location.LocationObjectCoords> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Location access is off for this app. Enable it in your phone settings.');
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return position.coords;
};

/**
 * Job-start check-in (selfie + GPS) and job-completion check-out (GPS only)
 * gates. Both block the rest of the job screen until they succeed.
 */
export const CheckInOutCard: React.FC<CheckInOutCardProps> = ({ call, onUpdated }) => {
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Finishes check-in once a selfie exists, whether it came back from the
   * camera normally or was recovered after Android killed the app.
   */
  const submitCheckIn = async (selfieBase64: string) => {
    setError(null);
    setBusy('in');
    try {
      const coords = await getGpsFix();
      const updated = await engineerCallsApi.checkIn(call._id, {
        selfieBase64,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? undefined,
      });
      onUpdated(updated);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? (err instanceof Error ? err.message : 'Check-in failed. Try again.'))
      );
    } finally {
      setBusy(null);
    }
  };

  /**
   * The selfie survives the app being killed.
   *
   * Android destroys this app while the camera activity is in front — on
   * some devices routinely ("has died: hvy LAST"). The photo is still taken;
   * expo-image-picker hands it back here on the next launch, so the engineer
   * does not have to notice the app restarted and start again.
   */
  usePendingCapture('check-in-selfie', call._id, async (dataUri) => {
    if (call.checkIn) return; // already checked in on a previous attempt
    await submitCheckIn(dataUri);
  });

  const doCheckIn = async () => {
    setError(null);
    setBusy('in');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera access is off for this app. Enable it in your phone settings.');
      }

      // Recorded BEFORE the camera opens: if the app is killed while it is
      // in front, this is the only record of what the photo was for.
      await captureIntent.set({ purpose: 'check-in-selfie', callId: call._id });

      // Never ask the picker for base64 at full resolution — see
      // utils/imageCapture.ts for why that was killing the app.
      const photo = await ImagePicker.launchCameraAsync({
        quality: 1,
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.front,
      });
      if (photo.canceled) {
        await captureIntent.clear();
        setBusy(null);
        return;
      }
      const selfieBase64 = (await compressAsset(photo.assets[0])).dataUri;
      await captureIntent.clear();

      const coords = await getGpsFix();
      const updated = await engineerCallsApi.checkIn(call._id, {
        selfieBase64,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? undefined,
      });
      onUpdated(updated);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? (err instanceof Error ? err.message : 'Check-in failed. Try again.'))
      );
    } finally {
      setBusy(null);
    }
  };

  const doCheckOut = async () => {
    setError(null);
    setBusy('out');
    try {
      const coords = await getGpsFix();
      const updated = await engineerCallsApi.checkOut(call._id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? undefined,
      });
      onUpdated(updated);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? (err instanceof Error ? err.message : 'Check-out failed. Try again.'))
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={[typography.label, styles.label]}>Check-in</Text>
          {call.checkIn ? (
            <Text style={[typography.small, styles.done]}>Checked in at {formatTime(call.checkIn.capturedAt)}</Text>
          ) : (
            <Text style={[typography.small, styles.pending]}>Required before you start the job</Text>
          )}
        </View>
        {call.checkIn ? (
          <Image source={{ uri: call.checkIn.selfieUrl }} style={styles.selfie} accessibilityLabel="Check-in selfie" />
        ) : (
          <Button label="Check in" onPress={doCheckIn} loading={busy === 'in'} loadingLabel="Checking in…" />
        )}
      </View>

      {call.checkIn ? (
        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.rowText}>
            <Text style={[typography.label, styles.label]}>Check-out</Text>
            {call.checkOut ? (
              <Text style={[typography.small, styles.done]}>Checked out at {formatTime(call.checkOut.capturedAt)}</Text>
            ) : (
              <Text style={[typography.small, styles.pending]}>Required before marking this job complete</Text>
            )}
          </View>
          {!call.checkOut && (
            <Button
              label="Check out"
              variant="secondary"
              onPress={doCheckOut}
              loading={busy === 'out'}
              loadingLabel="Checking out…"
            />
          )}
        </View>
      ) : null}

      {error ? <Notice tone="warning" message={error} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowDivider: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.textMuted,
  },
  done: {
    color: colors.text,
  },
  pending: {
    color: colors.textFaint,
  },
  selfie: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.sunken,
  },
});
