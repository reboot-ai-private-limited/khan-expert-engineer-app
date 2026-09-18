import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { engineerAuthApi } from '@/api/endpoints/engineerAuth';
import { AuthError } from '@/types/auth';
import { colors, spacing, typography } from '@/theme';

/**
 * Change password. The current password is required even though the app
 * already holds a valid token — the server enforces that too, so a phone
 * left unlocked is not enough to lock the real owner out.
 */
export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = 'Enter your current password.';
    if (!newPassword) next.newPassword = 'Choose a new password.';
    else if (newPassword.length < 6) next.newPassword = 'At least 6 characters.';
    else if (newPassword === currentPassword) next.newPassword = 'That is the same as your current password.';
    if (confirmPassword !== newPassword) next.confirmPassword = 'Passwords do not match.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setDone(false);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await engineerAuthApi.changePassword({ currentPassword, newPassword });
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not change your password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>Change password</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.small, styles.intro]}>
          You stay signed in on this device after changing it. You will need the new password the next time you
          sign in anywhere.
        </Text>

        {error ? <Notice tone="error" message={error} /> : null}
        {done ? <Notice tone="success" message="Your password has been changed." /> : null}

        <TextField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          error={fieldErrors.currentPassword}
          secure
          autoCapitalize="none"
        />
        <TextField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          error={fieldErrors.newPassword}
          secure
          autoCapitalize="none"
        />
        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          secure
          autoCapitalize="none"
        />

        <Button
          label="Change password"
          loadingLabel="Saving…"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
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
    flexShrink: 1,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  intro: {
    color: colors.textMuted,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
