import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { useAuth } from '@/context/AuthContext';
import { useOtpSender } from '@/hooks/useOtpSender';
import { env } from '@/config/env';
import { AuthError } from '@/types/auth';
import { colors, spacing, typography } from '@/theme';

/** Show the support number once the engineer has failed this many times. */
const FAILURES_BEFORE_SUPPORT = 3;
const CODE_LENGTH = 6;

/** Only a remembered phone number is worth prefilling — older builds could store an email. */
const asPhone = (value: string | null) => (value && /^\+?[\d\s-]{10,15}$/.test(value.trim()) ? value.trim() : '');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, lastLoginId, sessionEndedReason, clearSessionEndedReason } = useAuth();
  const otp = useOtpSender('login');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; code?: string }>({});
  const [failures, setFailures] = useState(0);

  const codeRef = useRef<TextInput>(null);
  const codeStep = otp.sentTo !== null;

  /** Prefill the remembered number so the engineer only has to tap "Send code". */
  useEffect(() => {
    if (lastLoginId && !phone) {
      setPhone(asPhone(lastLoginId));
    }
    // Intentionally keyed only on lastLoginId — this should not fight the
    // engineer if they clear the field themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLoginId]);

  const fail = (err: unknown) => {
    setError(err instanceof AuthError ? err : new AuthError('unknown', 'Something went wrong. Try again.'));
    setFailures((n) => n + 1);
  };

  const handleSendCode = async () => {
    if (otp.sending) return;
    Keyboard.dismiss();
    setError(null);
    clearSessionEndedReason();

    if (phone.replace(/\D/g, '').length < 10) {
      setFieldErrors({ phone: 'Enter your 10-digit mobile number.' });
      return;
    }
    setFieldErrors({});

    try {
      await otp.send(phone);
      setCode('');
      setTimeout(() => codeRef.current?.focus(), 150);
    } catch (err) {
      fail(err);
    }
  };

  const handleVerify = async () => {
    if (submitting || !otp.sentTo) return;
    Keyboard.dismiss();
    setError(null);

    if (code.length !== CODE_LENGTH) {
      setFieldErrors({ code: `Enter the ${CODE_LENGTH}-digit code from WhatsApp.` });
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await login(otp.sentTo, code);
      // Navigation is handled by the auth layout redirect once status flips.
      setFailures(0);
    } catch (err) {
      fail(err);
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const changeNumber = () => {
    otp.reset();
    setCode('');
    setError(null);
    setFieldErrors({});
  };

  const callSupport = () => {
    if (!env.supportPhone) return;
    void Linking.openURL(`tel:${env.supportPhone}`);
  };

  const showSupport = failures >= FAILURES_BEFORE_SUPPORT || error?.code === 'account_inactive';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.inner} onPress={Keyboard.dismiss} accessible={false}>
          {/* Title and form sit together as one centred group, so the whole
              screen balances around it instead of hugging the top. */}
          <View style={styles.centerBlock}>
            <View style={styles.titleBlock}>
              <Text style={[typography.display, styles.title]}>Field Engineer</Text>
              <Text style={[typography.body, styles.subtitle]}>
                {codeStep
                  ? 'Enter the code we sent to your WhatsApp.'
                  : 'Sign in with your mobile number — we will send a code to your WhatsApp.'}
              </Text>
            </View>

            <View style={styles.card}>
              {/* Why they were signed out, if they were */}
              {sessionEndedReason ? (
                <Notice tone="info" message={sessionEndedReason} />
              ) : null}

              {/* What went wrong */}
              {error ? (
                <Notice
                  tone={error.code === 'network' ? 'warning' : 'error'}
                  message={error.message}
                  action={
                    error.code === 'network'
                      ? 'Your work is not lost — sign in again once you have signal.'
                      : undefined
                  }
                />
              ) : null}

              {codeStep && otp.message && !error ? <Notice tone="info" message={otp.message} /> : null}

              <View style={styles.form}>
                {!codeStep ? (
                  <>
                    <TextField
                      label="Mobile number"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        if (fieldErrors.phone) setFieldErrors({});
                      }}
                      error={fieldErrors.phone}
                      placeholder="9876543210"
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                      maxLength={14}
                      returnKeyType="go"
                      editable={!otp.sending}
                      onSubmitEditing={handleSendCode}
                    />

                    <Button
                      label="Send code on WhatsApp"
                      loadingLabel="Sending…"
                      onPress={handleSendCode}
                      loading={otp.sending}
                      style={styles.submit}
                      testID="login-send-code"
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      ref={codeRef}
                      label="6-digit code"
                      value={code}
                      onChangeText={(text) => {
                        setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH));
                        if (fieldErrors.code) setFieldErrors({});
                      }}
                      error={fieldErrors.code}
                      placeholder="••••••"
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      maxLength={CODE_LENGTH}
                      returnKeyType="go"
                      editable={!submitting}
                      onSubmitEditing={handleVerify}
                    />

                    <Button
                      label="Sign in"
                      loadingLabel="Signing in…"
                      onPress={handleVerify}
                      loading={submitting}
                      style={styles.submit}
                      testID="login-submit"
                    />

                    <View style={styles.codeActions}>
                      <Text style={[typography.small, styles.link]} onPress={changeNumber}>
                        Change number
                      </Text>
                      <Text
                        style={[typography.small, otp.canResend ? styles.link : styles.footerText]}
                        onPress={otp.canResend ? handleSendCode : undefined}
                      >
                        {otp.canResend ? 'Resend code' : `Resend in ${otp.secondsLeft}s`}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[typography.small, styles.footerText]}>
              Changed your number, or no WhatsApp on it? The office can update it for you.
            </Text>

            {showSupport && env.supportPhone ? (
              <Button
                label={`Call the office · ${env.supportPhone}`}
                variant="secondary"
                onPress={callSupport}
              />
            ) : null}

            <Text
              style={[typography.small, styles.registerLink]}
              onPress={() => router.push('/(auth)/register')}
            >
              New engineer? Register here
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  inner: {
    flex: 1,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  card: {
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  form: {
    gap: spacing.lg,
  },
  submit: {
    marginTop: spacing.sm,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    color: colors.brand,
    fontWeight: '600',
  },
  footer: {
    gap: spacing.lg,
    paddingTop: spacing.xxl,
  },
  footerText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  registerLink: {
    color: colors.brand,
    textAlign: 'center',
    fontWeight: '600',
  },
});
