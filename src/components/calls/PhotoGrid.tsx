import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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
/** Compressed well below the server's 15MB JSON limit, even a few at once. */
const IMAGE_QUALITY = 0.5;

const toDataUri = (asset: ImagePicker.ImagePickerAsset): string | null => {
  if (!asset.base64) return null;
  const mime = asset.mimeType ?? 'image/jpeg';
  return `data:${mime};base64,${asset.base64}`;
};

export const PhotoGrid: React.FC<PhotoGridProps> = ({ callId, images, onImagesChange }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const dataUris = assets.map(toDataUri).filter((u): u is string => Boolean(u));
    if (dataUris.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      const merged = await engineerCallsApi.uploadServiceImages(callId, dataUris);
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

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is off for this app. Enable it in your phone settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: IMAGE_QUALITY,
      mediaTypes: ['images'],
    });
    if (!result.canceled) await upload(result.assets);
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is off for this app. Enable it in your phone settings to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: IMAGE_QUALITY,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_SELECTION,
    });
    if (!result.canceled) await upload(result.assets);
  };

  return (
    <View style={styles.container}>
      {images.length > 0 ? (
        <View style={styles.grid}>
          {images.map((img) => (
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
