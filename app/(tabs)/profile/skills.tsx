import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { compressAsset } from '@/utils/imageCapture';
import { skillsApi } from '@/api/endpoints/skills';
import { isNetworkError, serverMessage } from '@/api/client';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerSkillEntry, EngineerSkillStatus, Skill, SkillGroup } from '@/types/skill';

/** Merged view of one catalog skill against the engineer's own entry, if any. */
interface Row {
  skill: Skill;
  entry: EngineerSkillEntry | null;
}

const statusLabel = (row: Row): { text: string; tone: 'neutral' | 'pending' | 'held' | 'rejected' } => {
  if (!row.entry) return { text: 'Tap to request', tone: 'neutral' };
  if (row.entry.status === 'pending') return { text: 'Pending approval', tone: 'pending' };
  if (row.entry.status === 'rejected') return { text: 'Rejected — tap to re-request', tone: 'rejected' };
  // approved
  return row.entry.removalRequested
    ? { text: 'Removal pending', tone: 'pending' }
    : { text: 'Held', tone: 'held' };
};

export default function MySkillsScreen() {
  const insets = useSafeAreaInsets();

  const [catalog, setCatalog] = useState<SkillGroup[]>([]);
  const [mine, setMine] = useState<EngineerSkillEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busySkillId, setBusySkillId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [catalogResult, mineResult] = await Promise.all([
        skillsApi.getCatalog(),
        skillsApi.getMine(),
      ]);
      setCatalog(catalogResult);
      setMine(mineResult);
    } catch (error) {
      setErrorMessage(
        isNetworkError(error)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(error) ?? 'Could not load your skills.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mineBySkillId = useMemo(() => {
    const map = new Map<string, EngineerSkillEntry>();
    for (const entry of mine) map.set(entry.skillId._id, entry);
    return map;
  }, [mine]);

  const sections = useMemo(
    () =>
      catalog.map((group) => ({
        category: group.category,
        rows: group.items.map((skill) => ({ skill, entry: mineBySkillId.get(skill._id) ?? null })),
      })),
    [catalog, mineBySkillId]
  );

  const request = async (skill: Skill) => {
    if (skill.requiresCertification) {
      Alert.alert(
        'Certificate required',
        `"${skill.name}" needs proof of certification before it can be requested.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take photo', onPress: () => void captureCertificateAndRequest(skill, 'camera') },
          { text: 'Choose from gallery', onPress: () => void captureCertificateAndRequest(skill, 'library') },
        ]
      );
      return;
    }

    setBusySkillId(skill._id);
    try {
      const next = await skillsApi.request(skill._id);
      setMine(next);
    } catch (error) {
      Alert.alert('Could not request this skill', serverMessage(error) ?? (error as Error).message);
    } finally {
      setBusySkillId(null);
    }
  };

  const captureCertificateAndRequest = async (skill: Skill, source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', `Enable ${source === 'camera' ? 'camera' : 'photo library'} access in your phone settings to add this photo.`);
      return;
    }

    // Resized before encoding — a full-resolution base64 exhausts the heap
    // and gets the app killed. See utils/imageCapture.ts.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) return;
    const asset = result.assets[0];

    setBusySkillId(skill._id);
    try {
      const dataUri = (await compressAsset(asset)).dataUri;
      const certificateUrl = await skillsApi.uploadCertificate(dataUri);
      const next = await skillsApi.request(skill._id, certificateUrl);
      setMine(next);
    } catch (error) {
      Alert.alert('Could not request this skill', serverMessage(error) ?? (error as Error).message);
    } finally {
      setBusySkillId(null);
    }
  };

  const withdraw = async (skill: Skill, status: EngineerSkillStatus) => {
    const isApproved = status === 'approved';
    Alert.alert(
      isApproved ? 'Request to drop this skill?' : 'Withdraw this request?',
      isApproved
        ? `"${skill.name}" will stay on your list until an administrator confirms the removal.`
        : `Your request for "${skill.name}" will be withdrawn.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isApproved ? 'Request removal' : 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setBusySkillId(skill._id);
            try {
              const next = await skillsApi.withdraw(skill._id);
              setMine(next);
            } catch (error) {
              Alert.alert('Could not do that', serverMessage(error) ?? (error as Error).message);
            } finally {
              setBusySkillId(null);
            }
          },
        },
      ]
    );
  };

  const handlePress = (row: Row) => {
    if (busySkillId) return;

    if (!row.entry) return void request(row.skill);
    if (row.entry.status === 'rejected') return void request(row.skill);
    if (row.entry.status === 'pending') return void withdraw(row.skill, 'pending');
    if (row.entry.status === 'approved' && !row.entry.removalRequested) {
      return void withdraw(row.skill, 'approved');
    }
    // approved + removalRequested: nothing to do, already pending admin review.
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>My skills</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}>
        <Text style={[typography.small, styles.intro]}>
          Pick what you can do. Adding or dropping a skill needs the office's approval — it doesn't take effect
          until then.
        </Text>

        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : errorMessage ? (
          <Notice tone="error" message={errorMessage} />
        ) : sections.length === 0 ? (
          <Notice tone="info" message="No skills are set up yet. Contact the office." />
        ) : (
          sections.map((section) => (
            <View key={section.category} style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>{section.category}</Text>
              <View style={styles.rows}>
                {section.rows.map((row) => {
                  const label = statusLabel(row);
                  const busy = busySkillId === row.skill._id;
                  return (
                    <Pressable
                      key={row.skill._id}
                      onPress={() => handlePress(row)}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && !busy && styles.rowPressed,
                        busy && styles.rowBusy,
                      ]}
                    >
                      <View style={styles.rowText}>
                        <Text style={[typography.bodyStrong, styles.rowName]}>{row.skill.name}</Text>
                        {row.entry?.status === 'rejected' && row.entry.rejectionReason ? (
                          <Text style={[typography.caption, styles.rejectionReason]} numberOfLines={2}>
                            {row.entry.rejectionReason}
                          </Text>
                        ) : row.skill.requiresCertification && !row.entry ? (
                          <Text style={[typography.caption, styles.certNote]}>Needs a certificate</Text>
                        ) : null}
                      </View>

                      {busy ? (
                        <ActivityIndicator size="small" color={colors.brand} />
                      ) : (
                        <Text
                          style={[
                            typography.caption,
                            styles.badge,
                            label.tone === 'held' && styles.badgeHeld,
                            label.tone === 'pending' && styles.badgePending,
                            label.tone === 'rejected' && styles.badgeRejected,
                            label.tone === 'neutral' && styles.badgeNeutral,
                          ]}
                        >
                          {label.text}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  intro: {
    color: colors.textMuted,
  },
  centerBlock: {
    paddingVertical: spacing.huge,
    alignItems: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  rows: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  rowPressed: {
    backgroundColor: colors.sunken,
  },
  rowBusy: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
  },
  rejectionReason: {
    color: colors.danger,
  },
  certNote: {
    color: colors.warning,
  },
  badge: {
    fontWeight: '700',
  },
  badgeNeutral: {
    color: colors.textFaint,
  },
  badgeHeld: {
    color: colors.success,
  },
  badgePending: {
    color: colors.warning,
  },
  badgeRejected: {
    color: colors.danger,
  },
});
