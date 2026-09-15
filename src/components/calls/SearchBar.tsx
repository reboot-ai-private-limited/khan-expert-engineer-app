import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = 'Search your jobs…' }) => {
  return (
    <View style={styles.row}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.comfortable,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  clear: {
    paddingLeft: spacing.md,
  },
  clearText: {
    color: colors.brand,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
