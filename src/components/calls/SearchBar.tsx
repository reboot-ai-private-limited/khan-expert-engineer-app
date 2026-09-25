import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shows a filter button on the right when given — e.g. open the full, filterable list. */
  onFilterPress?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search your jobs…',
  onFilterPress,
}) => {
  return (
    <View style={styles.row}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[typography.body, styles.input]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        numberOfLines={1}
        multiline={false}
        accessibilityLabel="Search your assigned jobs"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}
        >
          <Text style={[typography.caption, styles.clearText]}>CLEAR</Text>
        </Pressable>
      ) : null}
      {onFilterPress ? (
        <Pressable
          onPress={onFilterPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Filter jobs"
          style={styles.filter}
        >
          <Ionicons name="options-outline" size={22} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.comfortable,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#D5DEEA',
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  clear: {
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    color: colors.brand,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filter: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
});
