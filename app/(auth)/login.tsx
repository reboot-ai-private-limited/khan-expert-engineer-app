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
import { env } from '@/config/env';
import { AuthError } from '@/types/auth';
import { colors, radius, spacing, typography } from '@/theme';

/** Show the support number once the engineer has failed this many times. */
const FAILURES_BEFORE_SUPPORT = 3;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, lastLoginId, sessionEndedReason, clearSessionEndedReason } = useAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ loginId?: string; password?: string }>({});
  const [failures, setFailures] = useState(0);

  const passwordRef = useRef<TextInput>(null);

  /** Prefill the remembered identifier so the engineer types only a password. */
  useEffect(() => {
    if (lastLoginId && !loginId) {
      setLoginId(lastLoginId);
    }
    // Intentionally keyed only on lastLoginId — this should not fight the
    // engineer if they clear the field themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLoginId]);

  const validate = (): boolean => {
    const next: { loginId?: string; password?: string } = {};
    if (!loginId.trim()) next.loginId = 'Enter your phone number or email.';
    if (!password) next.password = 'Enter your password.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;

    Keyboard.dismiss();
    setError(null);
    clearSessionEndedReason();

    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(loginId, password);
      // Navigation is handled by the auth layout redirect once status flips.
      setPassword('');
      setFailures(0);
    } catch (err) {
      const authError =
        err instanceof AuthError
          ? err
          : new AuthError('unknown', 'Something went wrong. Try again.');

      setError(authError);
      setFailures((n) => n + 1);

      // Only the password is wrong often enough to be worth clearing.
      if (authError.code === 'invalid_credentials') {
        setPassword('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const callSupport = () => {
    if (!env.supportPhone) return;
    void Linking.openURL(`tel:${env.supportPhone}`);
  };

  const showSupport = failures >= FAILURES_BEFORE_SUPPORT || error?.code === 'password_not_set';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.inner} onPress={Keyboard.dismiss} accessible={false}>
          {/* Identity */}
          <View style={styles.header}>
            <View style={styles.mark}>
              <Text style={styles.markText}>KE</Text>
            </View>
            <Text style={[typography.display, styles.title]}>Field Engineer</Text>
            <Text style={[typography.body, styles.subtitle]}>
              Sign in to see the jobs assigned to you.
            </Text>
          </View>

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

          {/* Form */}
          <View style={styles.form}>
            <TextField
              label="Phone number or email"
              value={loginId}
              onChangeText={(text) => {
                setLoginId(text);
                if (fieldErrors.loginId) setFieldErrors((p) => ({ ...p, loginId: undefined }));
              }}
              error={fieldErrors.loginId}
              placeholder="9876543210"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
            />

            <TextField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              error={fieldErrors.password}
              placeholder="Your password"
              secure
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
            />

            <Button
              label="Sign in"
              loadingLabel="Signing in…"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submit}
              testID="login-submit"
            />
          </View>

          {/* Escape hatch.
              There is no self-service password reset on the backend — an
              administrator sets engineer passwords by hand. Until that
              endpoint exists, the honest answer is "call the office". */}
          <View style={styles.footer}>
            <Text style={[typography.small, styles.footerText]}>
              Forgot your password? The office sets it for you — give them a call.
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  inner: {
    flex: 1,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markText: {
    ...typography.title,
    color: colors.textOnBrand,
    letterSpacing: 0.5,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
  },
  form: {
    gap: spacing.lg,
  },
  submit: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: 'auto',
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
