import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Notice } from '@/components/feedback/Notice';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';

interface ProductVideoSlotProps {
  call: EngineerCall;
  onUpdated: (updated: EngineerCall) => void;
}

/**
 * Short on purpose. An engineer is usually on mobile data, and a clip that
 * never finishes uploading is worse than no clip — 20 seconds is enough to
 * pan across a unit or capture a noise, and keeps the file in the tens of
 * megabytes rather than the hundreds.
 */
const MAX_SECONDS = 20;

/**
 * The server accepts 64MB (express-fileupload). Held slightly under that so
 * multipart overhead cannot push a borderline file over, and so the engineer
 * gets a clear message here instead of an opaque failure after a long upload
 * on mobile data.
 *
 * Only gallery picks need checking — a recording is capped by MAX_SECONDS.
 */
const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  return `${Math.round(seconds)}s`;
};

/**
 * A video of the unit, recorded during product verification.
 *
 * Uploaded as multipart straight from the file uri — never base64. A clip is
 * tens of megabytes, and base64 would build a ~1.33x string in the JS heap,
 * which is precisely what was getting the app killed on photos.
 */
export const ProductVideoSlot: React.FC<ProductVideoSlotProps> = ({ call, onUpdated }) => {
  const videos = call.service_videos ?? [];

  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (uri: string) => {
    setBusy(true);
    try {
      onUpdated(await engineerCallsApi.uploadVideo(call._id, uri));
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. A video needs a decent connection — try again on better signal.'
          : (serverMessage(err) ?? 'The video did not upload. Try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  /**
   * A clip recorded while Android had killed the app comes back here rather
   * than being lost — recording is a long spell with the app in the
   * background, which is exactly when the system reclaims it.
   */
  usePendingCapture('product-video', call._id, (uri) => upload(uri));

  const record = async () => {
    setError(null);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is off for this app. Enable it in your phone settings.');
      return;
    }

    await captureIntent.set({ purpose: 'product-video', callId: call._id });

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_SECONDS,
      quality: 0.5,
    });
    await captureIntent.clear();
    if (result.canceled) return;

    await upload(result.assets[0].uri);
  };

  /**
   * Pick an existing clip instead of recording one — useful when the
   * engineer filmed the fault before opening the app.
   */
  const chooseFromGallery = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is off for this app. Enable it in your phone settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.5,
    });
    if (result.canceled) return;

    const asset = result.assets[0];

    // Checked here, not at the server: the engineer finds out now rather
    // than after pushing tens of megabytes over mobile data.
    if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
      const mb = Math.round(asset.fileSize / (1024 * 1024));
      setError(`That video is ${mb}MB, which is too large to send. Record a short one instead.`);
      return;
    }

    await upload(asset.uri);
  };

  const remove = async (publicId: string) => {
    setError(null);
    setRemovingId(publicId);
    try {
      onUpdated(await engineerCallsApi.deleteVideo(call._id, publicId));
    } catch (err) {
      setError(serverMessage(err) ?? 'Could not remove that video.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <View style={styles.block}>
      <Text style={[typography.label, styles.label]}>Video of the unit</Text>

      {videos.map((video) => (
        <View key={video.public_id} style={styles.row}>
          <Ionicons name="videocam" size={18} color={colors.brand} />
          <Pressable
            style={styles.rowText}
            onPress={() => void Linking.openURL(video.secure_url)}
            accessibilityRole="button"
            accessibilityLabel="Play this video"
          >
            <Text style={[typography.small, styles.rowTitle]}>
              Recorded {formatDuration(video.duration) || 'clip'}
            </Text>
            <Text style={[typography.caption, styles.rowHint]}>Tap to play</Text>
          </Pressable>

          {removingId === video.public_id ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Pressable
              onPress={() => void remove(video.public_id)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Remove this video"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          )}
        </View>
      ))}

      {busy ? (
        <View style={styles.uploading}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={[typography.caption, styles.rowHint]}>Uploading — this can take a moment.</Text>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => void record()}
            accessibilityRole="button"
            accessibilityLabel="Record a video of the unit"
            style={({ pressed }) => [styles.recordBox, pressed && styles.recordPressed]}
          >
            <Ionicons name="videocam-outline" size={22} color={colors.brand} />
            <Text style={[typography.caption, styles.recordText]}>Record ({MAX_SECONDS}s)</Text>
          </Pressable>

          <Pressable
            onPress={() => void chooseFromGallery()}
            accessibilityRole="button"
            accessibilityLabel="Choose a video from the gallery"
            style={({ pressed }) => [styles.recordBox, pressed && styles.recordPressed]}
          >
            <Ionicons name="images-outline" size={22} color={colors.brand} />
            <Text style={[typography.caption, styles.recordText]}>From gallery</Text>
          </Pressable>
        </View>
      )}

      {error ? <Notice tone="error" message={error} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  label: { color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: colors.text },
  rowHint: { color: colors.textMuted },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recordBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.sunken,
  },
  recordPressed: { opacity: 0.75 },
  recordText: { color: colors.brand, fontWeight: '700' },
});
