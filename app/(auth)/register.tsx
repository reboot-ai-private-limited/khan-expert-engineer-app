import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { CircuitGradient } from '@/components/common/CircuitGradient';
import { useAuth } from '@/context/AuthContext';
import { AuthError, ENGINEER_TYPE_LABELS, SELECTABLE_ENGINEER_TYPES, type EngineerType } from '@/types/auth';
import { colors, spacing, typography } from '@/theme';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [route, setRoute] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [serviceCenterName, setServiceCenterName] = useState('');
  const [engineerType, setEngineerType] = useState<EngineerType>('freelance');
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter your full name.';
    if (!phone.trim()) next.phone = 'Enter your phone number.';
    if (!password) next.password = 'Choose a password.';
    else if (password.length < 6) next.password = 'At least 6 characters.';
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';
    if (engineerType === 'service_center' && !serviceCenterName.trim()) {
      next.serviceCenterName = 'Enter your service center name.';
    }
    if (engineerType === 'service_center' && !gstin.trim()) {
      next.gstin = 'GSTIN is required for a service center application.';
    }
    if (!consent) next.consent = 'Required to submit your application.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        route: route.trim() || undefined,
        engineerType,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankIfscCode: bankIfscCode.trim() || undefined,
        gstin: gstin.trim() || undefined,
        // Only sent for a service center — switching back to freelance drops it.
        serviceCenterName: engineerType === 'service_center' ? serviceCenterName.trim() || undefined : undefined,
      });
      // AuthContext flips to 'authenticated'; the (auth) layout routes a
      // pending account straight to /status — no manual navigation here.
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Something went wrong. Try again.';
      setError(message);
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
        <CircuitGradient />
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>Register as an engineer</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.small, styles.intro]}>
          An administrator reviews every application before you can be assigned work. You can log in and check
          your status any time after submitting.
        </Text>

        {error ? <Notice tone="error" message={error} /> : null}

        <Section title="Identity">
          <TextField label="Full name" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="As on your ID" />
          <TextField
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            error={fieldErrors.phone}
            placeholder="9876543210"
            keyboardType="phone-pad"
          />
          <TextField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        </Section>

        <Section title="Address">
          <TextField label="Address" value={addressLine1} onChangeText={setAddressLine1} placeholder="House, street, area" />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TextField label="City / town" value={city} onChangeText={setCity} />
            </View>
            <View style={styles.rowItem}>
              <TextField label="District" value={district} onChangeText={setDistrict} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TextField label="State" value={state} onChangeText={setState} placeholder="West Bengal" />
            </View>
            <View style={styles.rowItem}>
              <TextField label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
            </View>
          </View>
        </Section>

        <Section title="Work">
          <View style={styles.typeField}>
            <Text style={[typography.label, styles.typeLabel]}>I am applying as</Text>
            <View style={styles.typeRow}>
              {SELECTABLE_ENGINEER_TYPES.map((option) => {
                const selected = engineerType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setEngineerType(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.typeOption, selected && styles.typeOptionSelected]}
                  >
                    <Text style={[typography.body, selected ? styles.typeOptionTextSelected : styles.typeOptionText]}>
                      {ENGINEER_TYPE_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {engineerType === 'service_center' ? (
            <TextField
              label="Service center name"
              value={serviceCenterName}
              onChangeText={setServiceCenterName}
              error={fieldErrors.serviceCenterName}
              autoCapitalize="words"
              maxLength={100}
              placeholder="e.g. Sharma Electronics"
            />
          ) : null}

          {engineerType === 'service_center' ? (
            <TextField
              label="GSTIN"
              value={gstin}
              onChangeText={(t) => setGstin(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15))}
              error={fieldErrors.gstin}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="e.g. 22AAAAA0000A1Z5"
            />
          ) : null}

          <TextField label="Preferred work area / route (optional)" value={route} onChangeText={setRoute} />
          <TextField
            label="Years of experience (optional)"
            value={yearsOfExperience}
            onChangeText={(t) => setYearsOfExperience(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Text style={[typography.caption, styles.hint]}>
            You can pick your skills from your profile once your application is approved.
          </Text>
        </Section>

        <Section title="Bank details">
          <TextField
            label="Bank name (optional)"
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. State Bank of India"
          />
          <TextField
            label="Bank account number (optional)"
            value={bankAccountNumber}
            onChangeText={(t) => setBankAccountNumber(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="For paying you by bank transfer"
          />
          <TextField
            label="IFSC code (optional)"
            value={bankIfscCode}
            onChangeText={(t) => setBankIfscCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="e.g. SBIN0001234"
          />
        </Section>

        <Section title="Set a password">
          <TextField label="Password" value={password} onChangeText={setPassword} error={fieldErrors.password} secure autoCapitalize="none" />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            secure
            autoCapitalize="none"
          />
        </Section>

        <Pressable
          onPress={() => setConsent((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={styles.consentRow}
        >
          <View style={[styles.checkbox, consent && styles.checkboxActive]}>
            {consent ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={[typography.small, styles.consentText]}>
            The information above is true, and I consent to Khan Expert Tech storing it to review my application.
          </Text>
        </Pressable>
        {fieldErrors.consent ? <Text style={[typography.caption, styles.consentError]}>{fieldErrors.consent}</Text> : null}

        <Button
          label="Submit application"
          loadingLabel="Submitting…"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={[typography.label, styles.sectionLabel]}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
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
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.brandDark,
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    color: '#FFFFFF',
    flexShrink: 1,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  intro: {
    color: colors.textMuted,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  sectionBody: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowItem: {
    flex: 1,
  },
  hint: {
    color: colors.textFaint,
  },
  typeField: {
    gap: spacing.sm,
  },
  typeLabel: {
    color: colors.textMuted,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandWash,
  },
  typeOptionText: {
    color: colors.textMuted,
  },
  typeOptionTextSelected: {
    color: colors.brand,
    fontWeight: '700',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkmark: {
    color: colors.textOnBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    color: colors.text,
  },
  consentError: {
    color: colors.danger,
    marginLeft: 38,
    marginTop: -spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
