import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { idCardApi } from '@/api/endpoints/idCard';
import { ENGINEER_TYPE_LABELS } from '@/types/auth';
import { colors, radius, spacing, typography } from '@/theme';

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <Text style={[typography.title, styles.title]}>Profile</Text>

      <Pressable
        onPress={() => router.push('/(tabs)/profile/id-cards')}
        accessibilityRole="button"
        accessibilityLabel="Profile photo — tap to change"
        style={styles.photoRow}
      >
        <View style={styles.photoWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoInitial}>{engineer?.name?.trim()?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
        </View>
        <View style={styles.photoText}>
          <Text style={[typography.bodyStrong, styles.photoLabel]}>Profile photo</Text>
          <Text style={[typography.caption, styles.photoHint]}>{photoUrl ? 'Tap to change' : 'Tap to add a photo'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>

      <View style={styles.card}>
        <Text style={[typography.label, styles.cardHeaderLabel]}>Your details</Text>

        <Row label="Engineer ID" value={engineer?.engineerCode} />
        <Row label="Name" value={engineer?.name} />
        <Row label="Phone" value={engineer?.phone} />
        {engineer?.email ? <Row label="Email" value={engineer.email} /> : null}
        <Row
          label="Account type"
          value={engineer?.engineerType ? ENGINEER_TYPE_LABELS[engineer.engineerType] : undefined}
        />
      </View>

      <View style={styles.menu}>
        <MenuRow label="Edit profile" onPress={() => router.push('/(tabs)/profile/edit')} />
        <MenuRow label="Change password" onPress={() => router.push('/(tabs)/profile/password')} />
        <MenuRow label="Wallet" onPress={() => router.push('/(tabs)/profile/wallet')} />
        <MenuRow label="My skills" onPress={() => router.push('/(tabs)/profile/skills')} />
        <MenuRow label="KYC documents" onPress={() => router.push('/(tabs)/profile/kyc')} />
        <MenuRow label="ID cards" onPress={() => router.push('/(tabs)/profile/id-cards')} />
      </View>

      <Button
        label="Sign out"
        variant="secondary"
        onPress={handleLogout}
        loading={signingOut}
        loadingLabel="Signing out…"
        style={styles.signOut}
      />
    </ScrollView>
  );
}

const Row: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={[typography.label, styles.rowLabel]}>{label}</Text>
    <Text style={[typography.body, styles.rowValue]}>{value || '—'}</Text>
  </View>
);

const MenuRow: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
  >
    <Text style={[typography.bodyStrong, styles.menuRowLabel]}>{label}</Text>
    <Text style={styles.menuRowChevron}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    color: colors.text,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  photoWrap: {
    width: 52,
    height: 52,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
  },
  photoFallback: {
    backgroundColor: colors.brandWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.brand,
  },
  photoText: {
    flex: 1,
    gap: 2,
  },
  photoLabel: {
    color: colors.text,
  },
  photoHint: {
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    // The heading sat flush against the card edge without this.
    paddingTop: spacing.lg,
  },
  cardHeaderLabel: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    // Read-only text, not a tap target — it does not need the roomy
    // vertical rhythm the menu rows below use.
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    gap: 2,
  },
  rowLabel: {
    color: colors.textMuted,
  },
  rowValue: {
    color: colors.text,
  },
  menu: {
    gap: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  menuRowPressed: {
    backgroundColor: colors.sunken,
  },
  menuRowLabel: {
    color: colors.text,
  },
  menuRowChevron: {
    fontSize: 20,
    color: colors.textFaint,
  },
  signOut: {
    marginTop: 'auto',
    marginBottom: spacing.xxl,
  },
});
