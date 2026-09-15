import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as ScreenOrientation from 'expo-screen-orientation';
import { idCardApi } from '@/api/endpoints/idCard';
import { idCardCache } from '@/services/storage/idCardCache';
import { isNetworkError, serverMessage } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';
import type { IdCard } from '@/types/idCard';

const STATUS_COPY: Record<IdCard['status'], { label: string; tone: 'valid' | 'invalid' }> = {
  issued: { label: 'Valid', tone: 'valid' },
  expired: { label: 'Expired', tone: 'invalid' },
  revoked: { label: 'Revoked', tone: 'invalid' },
};

export default function IdCardScreen() {
  const insets = useSafeAreaInsets();
  const { callId } = useLocalSearchParams<{ callId: string }>();

  const [card, setCard] = useState<IdCard | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!callId) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await idCardApi.getForCall(callId);
      setCard(fresh);
      setOffline(false);
      void idCardCache.set(callId, fresh);
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await idCardCache.get(callId);
        if (cached) {
          setCard(cached);
          setOffline(true);
        } else {
          setError('No signal, and no card cached yet for this job. Connect once to load it, then it works offline.');
        }
      } else {
        setError(serverMessage(err) ?? 'Could not load the ID card for this job.');
      }
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Lock portrait for the duration the card is on screen, restore on the way out.
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    return () => {
      void ScreenOrientation.unlockAsync();
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, styles.headerTitle]}>ID Card</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centerAll}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : error ? (
        <View style={[styles.centerAll, { paddingHorizontal: spacing.xl }]}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textFaint} />
          <Text style={[typography.body, styles.errorText]}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryButton}>
            <Text style={[typography.bodyStrong, { color: colors.textOnBrand }]}>Try again</Text>
          </Pressable>
        </View>
      ) : card ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}>
          {offline ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
              <Text style={[typography.caption, styles.offlineText]}>
                Showing your last saved card — no signal right now.
              </Text>
            </View>
          ) : null}

          <CardFace card={card} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const CardFace: React.FC<{ card: IdCard }> = ({ card }) => {
  const statusCopy = STATUS_COPY[card.status];
  const isValid = statusCopy.tone === 'valid';

  return (
    <View style={styles.card}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={18} color={colors.textOnBrand} />
        </View>
        <View>
          <Text style={[typography.bodyStrong, styles.brandName]}>Khan Expert Tech</Text>
          <Text style={[typography.caption, styles.brandSub]}>Service Engineer</Text>
        </View>
      </View>

      <View style={[styles.statusPill, isValid ? styles.statusValid : styles.statusInvalid]}>
        <Ionicons
          name={isValid ? 'checkmark-circle' : 'close-circle'}
          size={18}
          color={isValid ? colors.success : colors.danger}
        />
        <Text style={[typography.bodyStrong, isValid ? styles.statusValidText : styles.statusInvalidText]}>
          {statusCopy.label}
        </Text>
      </View>

      <View style={styles.identityRow}>
        <View style={styles.photoWrap}>
          {card.engineer?.photoUrl ? (
            <Image source={{ uri: card.engineer.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoFallbackText}>{card.engineer?.name?.charAt(0) ?? '?'}</Text>
            </View>
          )}
        </View>
        <View style={styles.identityText}>
          <Text style={[typography.title, styles.engineerName]} numberOfLines={1}>
            {card.engineer?.name}
          </Text>
          <Text style={[typography.caption, styles.engineerCode]}>{card.engineer?.code}</Text>
          {card.engineer?.skills && card.engineer.skills.length > 0 ? (
            <Text style={[typography.caption, styles.skills]} numberOfLines={2}>
              {card.engineer.skills.join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.jobBlock}>
        <Text style={[typography.caption, styles.jobLabel]}>Job reference</Text>
        <Text style={[typography.bodyStrong, styles.jobValue]}>
          {card.ticketNumber} · {card.customerName}
        </Text>
      </View>
      <View style={styles.jobBlock}>
        <Text style={[typography.caption, styles.jobLabel]}>Valid until</Text>
        <Text style={[typography.bodyStrong, styles.jobValue]}>{new Date(card.validUntil).toLocaleString()}</Text>
      </View>

      <View style={styles.qrWrap}>
        <QRCode value={card.verifyUrl} size={220} color={colors.text} backgroundColor={colors.surface} />
        <Text style={[typography.caption, styles.qrHint]}>Ask the customer to scan to verify</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brandDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.surface,
  },
  centerAll: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: {
    color: colors.surface,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  scroll: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningWash,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    width: '100%',
  },
  offlineText: {
    color: colors.warning,
    flex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: colors.text,
  },
  brandSub: {
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusValid: {
    backgroundColor: colors.successWash,
  },
  statusInvalid: {
    backgroundColor: colors.dangerWash,
  },
  statusValidText: {
    color: colors.success,
  },
  statusInvalidText: {
    color: colors.danger,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photoWrap: {
    width: 84,
    height: 84,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
  },
  photoFallback: {
    backgroundColor: colors.brandWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.brand,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  engineerName: {
    color: colors.text,
  },
  engineerCode: {
    color: colors.textMuted,
  },
  skills: {
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  jobBlock: {
    gap: 2,
  },
  jobLabel: {
    color: colors.textFaint,
  },
  jobValue: {
    color: colors.text,
  },
  qrWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  qrHint: {
    color: colors.textMuted,
  },
});
