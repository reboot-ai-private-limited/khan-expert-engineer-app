import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerNote } from '@/types/call';

interface OfficeNotesCardProps {
  notes: EngineerNote[];
}

/** Instructions the office sent for this job — sent from the admin panel's "Instructions to Engineer" action. */
export const OfficeNotesCard: React.FC<OfficeNotesCardProps> = ({ notes }) => {
  if (!notes || notes.length === 0) return null;

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latest = sorted[0];

  return (
    <CollapsibleSection
      title="Office notes"
      summary={`${notes.length} note${notes.length > 1 ? 's' : ''} — latest: “${latest.note}”`}
      defaultExpanded
    >
      {sorted.map((n, idx) => (
        <View key={idx} style={styles.noteRow}>
          <Text style={[typography.small, styles.noteText]}>{n.note}</Text>
          <Text style={[typography.caption, styles.noteMeta]}>
            {n.authorName} · {new Date(n.createdAt).toLocaleString()}
          </Text>
        </View>
      ))}
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  noteRow: {
    backgroundColor: colors.warningWash,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  noteText: {
    color: colors.text,
  },
  noteMeta: {
    color: colors.textMuted,
  },
});
