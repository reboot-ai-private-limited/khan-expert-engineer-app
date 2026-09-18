import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { compressAsset } from '@/utils/imageCapture';
import { Ionicons } from '@expo/vector-icons';
import { idCardApi } from '@/api/endpoints/idCard';
import { isNetworkError, serverMessage } from '@/api/client';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { IdCard } from '@/types/idCard';

const IMAGE_QUALITY = 0.6;

export default function IdCardsScreen() {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<IdCard[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cardList, photo] = await Promise.all([idCardApi.listMine(), idCardApi.getMyIdPhoto()]);
      setCards(cardList);
      setPhotoUrl(photo);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not load your ID cards.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pickPhoto = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    // Resized before encoding — a full-resolution base64 exhausts the heap
    // and gets the app killed. See utils/imageCapture.ts.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });

    if (result.canceled) return;
    const asset = result.assets[0];

    setUploading(true);
    setError(null);
    try {
      const url = await idCardApi.uploadIdPhoto((await compressAsset(asset)).dataUri);
      setPhotoUrl(url);
    } catch (err) {
      setError(serverMessage(err) ?? 'Could not upload your photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>ID cards</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        <Text style={[typography.small, styles.intro]}>
          Your photo appears on the temporary ID card shown to customers. A card exists only while you're
          assigned to that job — it disappears automatically once the job ends.
        </Text>

        <View style={styles.photoRow}>
          <View style={styles.photoWrap}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <Ionicons name="person" size={28} color={colors.textFaint} />
              </View>
            )}
          </View>
          <View style={styles.photoActions}>
            <Pressable
              onPress={() => pickPhoto('camera')}
              disabled={uploading}
              style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
            >
              <Text style={[typography.caption, styles.photoButtonText]}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => pickPhoto('library')}
              disabled={uploading}
              style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}
            >
              <Text style={[typography.caption, styles.photoButtonText]}>Gallery</Text>
            </Pressable>
          </View>
        </View>
        {uploading ? <ActivityIndicator size="small" color={colors.brand} style={{ marginBottom: spacing.md }} /> : null}

        {error ? <Notice tone="error" message={error} /> : null}

        <Text style={[typography.label, styles.sectionLabel]}>Currently valid</Text>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name="card-outline" size={32} color={colors.textFaint} />
            <Text style={[typography.small, styles.emptyText]}>
              No active cards. Open an assigned job and tap "Show ID card" to issue one.
            </Text>
          </View>
        ) : (
          cards.map((card) => (
            <Pressable
              key={card._id}
              onPress={() => router.push({ pathname: '/id-card/[callId]', params: { callId: card.callId } })}
              style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
            >
              <View style={styles.cardRowIcon}>
                <Ionicons name="card" size={18} color={colors.brand} />
              </View>
              <View style={styles.cardRowText}>
                <Text style={[typography.bodyStrong, styles.cardRowTitle]} numberOfLines={1}>
                  {card.ticketNumber} · {card.customerName}
                </Text>
                <Text style={[typography.caption, styles.cardRowSub]}>
                  Valid until {new Date(card.validUntil).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

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
    gap: spacing.md,
  },
  intro: {
    color: colors.textMuted,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  photoWrap: {
    width: 72,
    height: 72,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
  },
  photoFallback: {
    backgroundColor: colors.sunken,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoButton: {
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoButtonText: {
    color: colors.brand,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  sectionLabel: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  centerBlock: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    color: colors.textFaint,
    textAlign: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowText: {
    flex: 1,
    gap: 2,
  },
  cardRowTitle: {
    color: colors.text,
  },
  cardRowSub: {
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 20,
    color: colors.textFaint,
  },
});
