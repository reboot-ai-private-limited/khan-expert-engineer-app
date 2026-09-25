import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { capturePhoto, pickPhotos } from '@/utils/imageCapture';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { ServiceImage } from '@/types/call';

interface PhotoGridProps {
  callId: string;
  images: ServiceImage[];
  onImagesChange: (next: ServiceImage[]) => void;
}

const MAX_SELECTION = 5;
export const PhotoGrid: React.FC<PhotoGridProps> = ({ callId, images, onImagesChange }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Uploads one photo per request rather than all of them in a single body.
   *
   * Sending five at once meant five base64 strings concatenated into one
   * JSON payload, which axios then copies again — tens of megabytes of peak
   * allocation against a 384MB heap. One at a time keeps the peak flat, and
   * a failure halfway through keeps the photos that already landed.
   */
  const upload = async (photos: { dataUri: string }[]) => {
    if (photos.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      let merged = images;
      for (const photo of photos) {
        merged = await engineerCallsApi.uploadServiceImages(callId, [photo.dataUri]);
      }
      onImagesChange(merged);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'The photo did not upload. Try again.')
      );
    } finally {
      setUploading(false);
    }
  };

  // A photo taken while Android killed the app behind the camera — it
  // comes back here on the next launch instead of being lost.
  usePendingCapture('work-photo', callId, async (dataUri) => {
    await upload([{ dataUri }]);
  });

  const takePhoto = async () => {
    try {
      // Recorded before the camera opens: if the app is killed while it is
      // in front, this is the only record of where the photo belongs.
      await captureIntent.set({ purpose: 'work-photo', callId });
      const photo = await capturePhoto();
      await captureIntent.clear();
      if (photo) await upload([photo]);
    } catch (err) {
      await captureIntent.clear();
      setError(err instanceof Error ? err.message : 'Could not take that photo.');
    }
  };

  const chooseFromLibrary = async () => {
    try {
      await upload(await pickPhotos(MAX_SELECTION));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those photos.');
    }
  };

  // Private photos (the purchase bill) are saved with no public link — there
  // is nothing to preview, and an empty uri makes <Image> warn.
  const viewable = images.filter((img) => Boolean(img.secure_url));

  return (
    <View style={styles.container}>
      {viewable.length > 0 ? (
        <View style={styles.grid}>
          {viewable.map((img) => (
            <Image
              key={img.public_id}
              source={{ uri: img.secure_url }}
              style={styles.thumb}
              accessibilityLabel="Service photo"
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={[typography.caption, styles.emptyText]}>No photos added yet.</Text>
        </View>
      )}

      {error ? <Notice tone="warning" message={error} /> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={takePhoto}
          disabled={uploading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
            uploading && styles.actionButtonDisabled,
          ]}
        >
          <Text style={[typography.small, styles.actionText]}>Take photo</Text>
        </Pressable>
        <Pressable
          onPress={chooseFromLibrary}
          disabled={uploading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
            uploading && styles.actionButtonDisabled,
          ]}
        >
          <Text style={[typography.small, styles.actionText]}>Choose from gallery</Text>
        </Pressable>
      </View>

      {uploading ? (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={[typography.caption, styles.uploadingText]}>Uploading…</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textFaint,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: colors.brand,
    fontWeight: '700',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadingText: {
    color: colors.textMuted,
  },
});
