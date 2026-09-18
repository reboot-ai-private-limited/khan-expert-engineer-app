import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { compressAsset } from '@/utils/imageCapture';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface PhotoSlotProps {
  label: string;
  /** data: URI, ready to send as *Base64 in the upload payload. */
  value: string | null;
  onChange: (dataUri: string) => void;
}

const IMAGE_QUALITY = 0.6;

/** One document photo — camera or gallery, matching KYC capture conventions (gallery is fine for documents). */
export const PhotoSlot: React.FC<PhotoSlotProps> = ({ label, value, onChange }) => {
  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Enable ${source === 'camera' ? 'camera' : 'photo library'} access in your phone settings to add this photo.`);
      return;
    }

    // Resized before encoding — a full-resolution base64 exhausts the heap
    // and gets the app killed. See utils/imageCapture.ts.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });

    if (result.canceled) return;
    onChange((await compressAsset(result.assets[0])).dataUri);
  };

  return (
    <View style={styles.container}>
      <Text style={[typography.label, styles.label]}>{label}</Text>
      {value ? (
        <Image source={{ uri: value }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={[typography.caption, styles.placeholderText]}>No photo yet</Text>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable onPress={() => pick('camera')} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={[typography.caption, styles.actionText]}>Camera</Text>
        </Pressable>
        <Pressable onPress={() => pick('library')} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Text style={[typography.caption, styles.actionText]}>Gallery</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
  },
  preview: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
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
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  actionText: {
    color: colors.brand,
    fontWeight: '700',
  },
});
