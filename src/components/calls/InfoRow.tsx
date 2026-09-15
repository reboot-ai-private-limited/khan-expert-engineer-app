import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface InfoRowProps {
  label: string;
  value?: string | number | null;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;

  return (
    <View style={styles.row}>
      <Text style={[typography.caption, styles.label]}>{label}</Text>
      <Text style={[typography.small, styles.value]} numberOfLines={2}>
        {String(value)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 6,
  },
  label: {
    color: colors.textFaint,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});
