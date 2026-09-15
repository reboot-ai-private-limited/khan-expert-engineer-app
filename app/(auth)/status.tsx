import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { useAuth } from '@/context/AuthContext';
import { isNetworkError, serverMessage } from '@/api/client';
import { AuthError } from '@/types/auth';
import { env } from '@/config/env';
import { colors, radius, spacing, typography } from '@/theme';

const HEADLINE: Record<string, string> = {
  pending_approval: 'Waiting for approval',
  changes_requested: 'Changes needed',
  rejected: 'Application declined',
};

const BODY: Record<string, string> = {
  pending_approval: "The office is reviewing your application. This screen updates once they've decided — pull down to check now.",
  changes_requested: 'The office has asked you to fix something before they can approve you. See below.',
  rejected: 'The office has declined this application.',
};

export default function ApplicationStatusScreen() {
  const insets = useSafeAreaInsets();
  const { engineer, logout, refreshRegistrationStatus, resubmitRegistration } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState(engineer?.name ?? '');
  const [email, setEmail] = useState(engineer?.email ?? '');

  useEffect(() => {
    void refreshRegistrationStatus();
    // Intentionally once on mount — a pull-to-refresh covers the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshRegistrationStatus();
    } finally {
      setRefreshing(false);
    }
  }, [refreshRegistrationStatus]);

  const accountStatus = engineer?.accountStatus ?? 'pending_approval';
  const headline = HEADLINE[accountStatus] ?? 'Application status';
  const body = BODY[accountStatus] ?? '';

  const tone = useMemo(() => {
    if (accountStatus === 'rejected') return 'error' as const;
    if (accountStatus === 'changes_requested') return 'warning' as const;
    return 'info' as const;
  }, [accountStatus]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  const handleResubmit = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      await resubmitRegistration({ name: name.trim(), email: email.trim() });
      setEditing(false);
    } catch (error) {
      setFormError(
        isNetworkError(error)
          ? 'Could not reach the server. Try again once you have signal.'
          : error instanceof AuthError
            ? error.message
            : (serverMessage(error) ?? 'Could not resubmit. Try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const callSupport = () => {
    if (!env.supportPhone) return;
    void Linking.openURL(`tel:${env.supportPhone}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxxl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      <Text style={[typography.label, styles.eyebrow]}>Application status</Text>
      <Text style={[typography.display, styles.headline]}>{headline}</Text>

      <Notice tone={tone} message={body} />

      {(accountStatus === 'rejected' || accountStatus === 'changes_requested') && engineer?.reviewNote ? (
        <View style={styles.noteBox}>
          <Text style={[typography.label, styles.noteLabel]}>What the office said</Text>
          <Text style={[typography.body, styles.noteText]}>{engineer.reviewNote}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Row label="Name" value={engineer?.name} />
        <Row label="Phone" value={engineer?.phone} />
        {engineer?.email ? <Row label="Email" value={engineer.email} /> : null}
      </View>

      {accountStatus === 'changes_requested' && !editing ? (
        <Button label="Fix and resubmit" onPress={() => setEditing(true)} />
      ) : null}

      {accountStatus === 'changes_requested' && editing ? (
        <View style={styles.editForm}>
          {formError ? <Notice tone="error" message={formError} /> : null}
          <TextField label="Full name" value={name} onChangeText={setName} />
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <View style={styles.editActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.editButton} />
            <Button
              label="Resubmit"
              loadingLabel="Sending…"
              onPress={handleResubmit}
              loading={submitting}
              style={styles.editButton}
            />
          </View>
        </View>
      ) : null}

      {env.supportPhone ? (
        <Text style={[typography.small, styles.support]} onPress={callSupport}>
          Questions? Call the office · {env.supportPhone}
        </Text>
      ) : null}

      <Button
        label="Sign out"
        variant="secondary"
        onPress={handleSignOut}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  eyebrow: {
    color: colors.textMuted,
  },
  headline: {
    color: colors.text,
    marginTop: -spacing.xs,
  },
  noteBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  noteLabel: {
    color: colors.textMuted,
  },
  noteText: {
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
  editForm: {
    gap: spacing.lg,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
  },
  support: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '600',
  },
  signOut: {
    marginTop: spacing.md,
  },
});
