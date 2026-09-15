import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing, typography } from '@/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { engineer, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={[typography.title, styles.title]}>Profile</Text>

      <View style={styles.card}>
        <Row label="Name" value={engineer?.name} />
        <Row label="Phone" value={engineer?.phone} />
        {engineer?.email ? <Row label="Email" value={engineer.email} /> : null}
      </View>

      <View style={styles.menu}>
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
    </View>
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.xl,
  },
  title: {
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    gap: spacing.xs,
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
