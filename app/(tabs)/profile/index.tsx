import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { idCardApi } from '@/api/endpoints/idCard';
import { ENGINEER_TYPE_LABELS } from '@/types/auth';
import { colors, radius, spacing, typography } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** The same tinted icon chips as the home screen tiles. */
const TINT = {
  blue: { accent: '#1D6FE0', chip: '#DCEAFE' },
  purple: { accent: '#4C3AA8', chip: '#E5E0FA' },
  amber: { accent: '#C98A00', chip: '#FDEFC4' },
  green: { accent: '#0F8A5F', chip: '#D5F3E6' },
  red: { accent: '#E0344B', chip: '#FDDDE1' },
  slate: { accent: '#1E293B', chip: '#E2E8F0' },
} as const;
type Tint = keyof typeof TINT;

/** "rajdeep majumdar" → "Rajdeep Majumdar" — names are stored as typed. */
const titleCase = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { engineer, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    idCardApi
      .getMyIdPhoto()
      .then((url) => {
        if (!cancelled) setPhotoUrl(url);
      })
      .catch(() => {
        // No photo uploaded yet — the initial-letter avatar below covers it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = engineer?.name ? titleCase(engineer.name) : 'Engineer';
  const accountType = engineer?.engineerType ? ENGINEER_TYPE_LABELS[engineer.engineerType] : undefined;

  return (
    // The inset sits outside the scroll view, so content scrolls under a
    // clean edge instead of up behind the clock and battery icons.
    <View style={[styles.screen, { paddingTop: insets.top }]}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        { paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      {/* Header — tapping the photo opens ID cards, where it is changed. */}
      <View style={styles.header}>
        <View style={[styles.bubble, styles.bubbleLarge]} />
        <View style={[styles.bubble, styles.bubbleSmall]} />

        <Pressable
          onPress={() => router.push('/(tabs)/profile/id-cards')}
          accessibilityRole="button"
          accessibilityLabel={photoUrl ? 'Profile photo — tap to change' : 'Add a profile photo'}
          style={styles.avatarWrap}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{displayName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={13} color={colors.brand} />
          </View>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {engineer?.engineerCode ? (
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{engineer.engineerCode}</Text>
            </View>
          ) : null}
          {accountType ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {accountType}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your details</Text>
        <DetailRow icon="call" tint="green" label="Phone" value={engineer?.phone} />
        <DetailRow icon="mail" tint="blue" label="Email" value={engineer?.email} />
        <DetailRow icon="id-card" tint="purple" label="Engineer ID" value={engineer?.engineerCode} />
        <DetailRow icon="briefcase" tint="amber" label="Account type" value={accountType} last />
      </View>

      {/* Menu */}
      <View style={styles.card}>
        <MenuRow icon="create" tint="blue" label="Edit profile" onPress={() => router.push('/(tabs)/profile/edit')} />
        <MenuRow icon="wallet" tint="amber" label="Wallet" onPress={() => router.push('/(tabs)/profile/wallet')} />
        <MenuRow icon="construct" tint="green" label="My skills" onPress={() => router.push('/(tabs)/profile/skills')} />
        <MenuRow icon="shield-checkmark" tint="red" label="KYC documents" onPress={() => router.push('/(tabs)/profile/kyc')} />
        <MenuRow icon="card" tint="slate" label="ID cards" onPress={() => router.push('/(tabs)/profile/id-cards')} last />
      </View>

      <Pressable
        onPress={handleLogout}
        disabled={signingOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
      >
        {signingOut ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        )}
        <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(tabs)/profile/delete-account')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
      >
        <Text style={styles.deleteLinkText}>Delete account</Text>
      </Pressable>
    </ScrollView>
    </View>
  );
}

const IconChip: React.FC<{ icon: IconName; tint: Tint }> = ({ icon, tint }) => (
  <View style={[styles.chip, { backgroundColor: TINT[tint].chip }]}>
    <Ionicons name={icon} size={18} color={TINT[tint].accent} />
  </View>
);

const DetailRow: React.FC<{ icon: IconName; tint: Tint; label: string; value?: string; last?: boolean }> = ({
  icon,
  tint,
  label,
  value,
  last,
}) => (
  <View style={[styles.row, !last && styles.rowDivider]}>
    <IconChip icon={icon} tint={tint} />
    <View style={styles.rowText}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  </View>
);

const MenuRow: React.FC<{ icon: IconName; tint: Tint; label: string; onPress: () => void; last?: boolean }> = ({
  icon,
  tint,
  label,
  onPress,
  last,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.pressed]}
  >
    <IconChip icon={icon} tint={tint} />
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
  </Pressable>
);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: '#EEF3F9',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  // Soft lighter shapes, echoing the home banner's background.
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bubbleLarge: {
    width: 180,
    height: 180,
    top: -70,
    right: -50,
  },
  bubbleSmall: {
    width: 110,
    height: 110,
    bottom: -60,
    right: 70,
  },
  avatarWrap: {
    width: 76,
    height: 76,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  avatarFallback: {
    backgroundColor: colors.brandWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.brand,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brand,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.textOnBrand,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  codeText: {
    ...typography.caption,
    color: colors.textOnBrand,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSub: {
    ...typography.small,
    color: colors.textOnBrand,
    opacity: 0.9,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E3E9F2',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    shadowColor: '#0B192C',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    ...typography.label,
    color: colors.textMuted,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E9F2',
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  menuLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#F5C2C9',
    backgroundColor: '#FFF5F6',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: 'auto',
  },
  signOutText: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  deleteLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteLinkText: {
    ...typography.small,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
