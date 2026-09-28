import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useOtpSender } from '@/hooks/useOtpSender';
import { Notice } from '@/components/feedback/Notice';
import { engineerAuthApi } from '@/api/endpoints/engineerAuth';
import { useAuth } from '@/context/AuthContext';
import { AuthError } from '@/types/auth';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Delete account (Play Store requirement). Sends a request — the office
 * settles anything owed, then erases the personal data. The server signs
 * the engineer out everywhere as soon as the request is accepted, so this
 * screen logs out locally right after.
 *
 * The same request can be made without the app at khanexpert.in/delete-account.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { logout, engineer } = useAuth();
  const otp = useOtpSender('delete_account');

  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | undefined>();

  const sendCode = async () => {
    if (!engineer?.phone) return;
    setError(null);
    try {
      await otp.send(engineer.phone);
      setCode('');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not send the code. Try again.');
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await engineerAuthApi.requestAccountDeletion({ otp: code, reason: reason.trim() || undefined });
      Alert.alert(
        'Request received',
        'You have been signed out. Your personal data will be erased within 30 days. Contact the office if you change your mind.',
        [{ text: 'OK', onPress: () => void logout() }],
        { cancelable: false }
      );
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not send your request. Try again.');
      setSubmitting(false);
    }
  };

  const confirm = () => {
    if (submitting) return;
    if (code.length !== 6) {
      setCodeError(otp.sentTo ? 'Enter the 6-digit code from WhatsApp.' : 'Send a code to your WhatsApp first.');
      return;
    }
    setCodeError(undefined);
    Alert.alert(
      'Delete your account?',
      'You will be signed out and will not be able to sign in again with this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void submit() },
      ]
    );
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
        <Text style={[typography.title, styles.headerTitle]}>Delete account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What gets deleted</Text>
          <Bullet text="Your name, phone number, email and address" />
          <Bullet text="Bank details and GSTIN" />
          <Bullet text="Aadhaar, PAN, ID photo and skill certificates" />
          <Bullet text="Your login — you will be signed out on every device" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What we keep</Text>
          <Text style={[typography.small, styles.muted]}>
            Records of jobs you completed, wallet payments and invoices are kept without your personal details, as
            required for accounts and tax.
          </Text>
        </View>

        <Notice
          tone="warning"
          message="The office will settle any wallet balance first, then complete the deletion within 30 days."
        />

        {error ? <Notice tone="error" message={error} /> : null}

        <TextField
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          placeholder="Tell us why you are leaving"
          multiline
          maxLength={500}
        />
        {otp.message ? <Notice tone="info" message={otp.message} /> : null}
        <Button
          label={otp.sentTo ? (otp.canResend ? 'Resend code' : `Resend in ${otp.secondsLeft}s`) : 'Send code on WhatsApp'}
          loadingLabel="Sending…"
          variant="secondary"
          onPress={sendCode}
          loading={otp.sending}
          disabled={!!otp.sentTo && !otp.canResend}
        />
        <TextField
          label="6-digit code"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          error={codeError}
          hint="We send a code to your WhatsApp to confirm it's you."
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />

        <Pressable
          onPress={confirm}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
          style={({ pressed }) => [styles.deleteButton, (pressed || submitting) && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.textOnBrand} />
          <Text style={styles.deleteLabel}>{submitting ? 'Sending request…' : 'Delete my account'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Bullet: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.bullet}>
    <Ionicons name="close-circle" size={18} color={colors.danger} />
    <Text style={[typography.small, styles.bulletText]}>{text}</Text>
  </View>
);

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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.label,
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletText: {
    color: colors.text,
    flex: 1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
    marginTop: spacing.sm,
  },
  deleteLabel: {
    ...typography.label,
    color: colors.textOnBrand,
  },
  pressed: {
    opacity: 0.7,
  },
});
