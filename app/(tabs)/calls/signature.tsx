import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { SignaturePad } from '@/components/calls/SignaturePad';
import { Notice } from '@/components/feedback/Notice';
import { useCalls } from '@/context/CallsContext';
import { colors, spacing, typography } from '@/theme';

/**
 * Full-screen so the customer has real room to sign — pushed from
 * CustomerSignatureCard, presented as a fullScreenModal from
 * `(tabs)/calls/_layout.tsx`. Nested inside `(tabs)` (rather than a root
 * route, like the ID card modal) specifically so it inherits CallsProvider —
 * this screen needs `useCalls()` to update the job in place.
 */
export default function SignatureScreen() {
  const insets = useSafeAreaInsets();
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const { getById, applyUpdate } = useCalls();
  const call = getById(callId);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDone = async (pathData: string, width: number, height: number) => {
    if (!call) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await engineerCallsApi.submitCustomerSignature(call._id, pathData, width, height);
      applyUpdate(updated);
      router.back();
    } catch (err) {
      setError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not save the signature.'));
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, styles.headerTitle]}>Customer Signature</Text>
        <View style={{ width: 26 }} />
      </View>

      {error ? (
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
          <Notice tone="error" message={error} />
        </View>
      ) : null}

      <View style={styles.padArea}>
        <SignaturePad onDone={handleDone} busy={submitting} fill />
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitle: {
    color: colors.text,
  },
  padArea: {
    flex: 1,
    padding: spacing.xl,
  },
});
