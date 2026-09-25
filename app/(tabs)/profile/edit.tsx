import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { engineerAuthApi } from '@/api/endpoints/engineerAuth';
import { useAuth } from '@/context/AuthContext';
import { isNetworkError, serverMessage } from '@/api/client';
import {
  AuthError,
  ENGINEER_TYPE_LABELS,
  SELECTABLE_ENGINEER_TYPES,
  type EngineerType,
} from '@/types/auth';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Self-service profile edit.
 *
 * Name, phone and engineer ID are shown read-only — the server refuses them
 * on this endpoint. The name is printed on the customer-facing job ID card
 * and the phone is the login id, so both are the office's to change.
 */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { engineer, updateProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [route, setRoute] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [engineerType, setEngineerType] = useState<EngineerType>('freelance');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Prefill from the server rather than the cached login response — the
  // cached copy predates address/experience for anyone signed in a while.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const fresh = await engineerAuthApi.getProfile();
        if (cancelled) return;
        setEmail(fresh.email ?? '');
        setRoute(fresh.route ?? '');
        setYearsOfExperience(
          fresh.yearsOfExperience === undefined || fresh.yearsOfExperience === null
            ? ''
            : String(fresh.yearsOfExperience)
        );
        setAddressLine1(fresh.address?.line1 ?? '');
        setCity(fresh.address?.city ?? '');
        setDistrict(fresh.address?.district ?? '');
        setState(fresh.address?.state ?? '');
        setPincode(fresh.address?.pincode ?? '');
        setBankName(fresh.bankName ?? '');
        setBankAccountNumber(fresh.bankAccountNumber ?? '');
        setBankIfscCode(fresh.bankIfscCode ?? '');
        setGstin(fresh.gstin ?? '');
        if (fresh.engineerType === 'freelance' || fresh.engineerType === 'service_center') {
          setEngineerType(fresh.engineerType);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          isNetworkError(err)
            ? 'Could not reach the server. Try again once you have signal.'
            : (serverMessage(err) ?? 'Could not load your profile.')
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaved(false);

    // Same rule as registration: a service center must have a GSTIN.
    const isServiceCenter = isExternal(engineer?.engineerType) && engineerType === 'service_center';
    if (isServiceCenter && !gstin.trim()) {
      setError('GSTIN is required for a service center.');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        email: email.trim(),
        route: route.trim(),
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfscCode: bankIfscCode.trim(),
        // Only offered to engineers who are already one of the external
        // types — in-house staff never see the picker, so never send it.
        ...(isExternal(engineer?.engineerType) ? { engineerType } : {}),
        // Only a service center has a GSTIN; a freelancer's stored one is left untouched.
        ...(isServiceCenter ? { gstin: gstin.trim() } : {}),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Could not save your profile. Try again.');
    } finally {
      setSaving(false);
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
        <Text style={[typography.title, styles.headerTitle]}>Edit profile</Text>
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : loadError ? (
        <View style={styles.centerBlock}>
          <Notice tone="error" message={loadError} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Notice tone="error" message={error} /> : null}
          {saved ? <Notice tone="success" message="Your profile has been saved." /> : null}

          <Section title="Set by the office">
            <ReadOnlyRow label="Engineer ID" value={engineer?.engineerCode} />
            <ReadOnlyRow label="Full name" value={engineer?.name} />
            <ReadOnlyRow label="Phone number" value={engineer?.phone} />
            <Text style={[typography.caption, styles.hint]}>
              Your name is printed on your job ID card and your phone number is how you sign in, so the office
              changes these for you. Ask them if either is wrong.
            </Text>
          </Section>

          <Section title="Contact">
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
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
                <TextField
                  label="Pincode"
                  value={pincode}
                  onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </Section>

          <Section title="Work">
            {isExternal(engineer?.engineerType) ? (
              <View style={styles.typeField}>
                <Text style={[typography.label, styles.typeLabel]}>I work as</Text>
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
                        <Text
                          style={[typography.body, selected ? styles.typeOptionTextSelected : styles.typeOptionText]}
                        >
                          {ENGINEER_TYPE_LABELS[option]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {engineerType === 'service_center' ? (
                  <TextField
                    label="GSTIN"
                    value={gstin}
                    onChangeText={(t) => setGstin(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15))}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                  />
                ) : null}
              </View>
            ) : (
              <ReadOnlyRow
                label="Account type"
                value={engineer?.engineerType ? ENGINEER_TYPE_LABELS[engineer.engineerType] : undefined}
              />
            )}

            <TextField label="Preferred work area / route" value={route} onChangeText={setRoute} />
            <TextField
              label="Years of experience"
              value={yearsOfExperience}
              onChangeText={(t) => setYearsOfExperience(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            <Text style={[typography.caption, styles.hint]}>
              Your skills are managed separately, under Profile → My skills.
            </Text>
          </Section>

          <Section title="Bank details">
            <TextField
              label="Bank name"
              value={bankName}
              onChangeText={setBankName}
              autoCapitalize="words"
              placeholder="e.g. State Bank of India"
            />
            <TextField
              label="Bank account number"
              value={bankAccountNumber}
              onChangeText={(t) => setBankAccountNumber(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="For paying you by bank transfer"
            />
            <TextField
              label="IFSC code"
              value={bankIfscCode}
              onChangeText={(t) => setBankIfscCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="e.g. SBIN0001234"
            />
          </Section>

          <Button
            label="Save changes"
            loadingLabel="Saving…"
            onPress={handleSave}
            loading={saving}
            style={styles.submit}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

/** In-house staff cannot reassign themselves — the server rejects it too. */
const isExternal = (type: EngineerType | undefined): boolean =>
  type === 'freelance' || type === 'service_center';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={[typography.label, styles.sectionLabel]}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const ReadOnlyRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <View style={styles.readOnlyRow}>
    <Text style={[typography.label, styles.readOnlyLabel]}>{label}</Text>
    <Text style={[typography.body, styles.readOnlyValue]}>{value || '—'}</Text>
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
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.xl,
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
  readOnlyRow: {
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  readOnlyLabel: {
    color: colors.textFaint,
  },
  readOnlyValue: {
    color: colors.textMuted,
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
  submit: {
    marginTop: spacing.sm,
  },
});
