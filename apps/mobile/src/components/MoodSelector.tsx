import { Pressable, StyleSheet, View } from 'react-native';

import type { MoodValue } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

const options: Array<{ value: MoodValue; emoji: string; label: string }> = [
  { value: 'very_low', emoji: '😣', label: 'Muito difícil' },
  { value: 'low', emoji: '😟', label: 'Difícil' },
  { value: 'neutral', emoji: '😐', label: 'Neutro' },
  { value: 'good', emoji: '🙂', label: 'Bem' },
  { value: 'very_good', emoji: '😊', label: 'Muito bem' },
];

type Props = { value: MoodValue; onChange: (value: MoodValue) => void; testIDPrefix?: string };

export function MoodSelector({ value, onChange, testIDPrefix = 'mood' }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            testID={`${testIDPrefix}-${option.value}`}
            onPress={() => onChange(option.value)}
            style={[styles.item, selected && styles.selected]}
          >
            <AppText style={styles.emoji}>{option.emoji}</AppText>
            <AppText variant="caption" style={styles.label}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
  item: {
    flex: 1,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 2,
  },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primaryStrong },
  emoji: { fontSize: 25, lineHeight: 30 },
  label: { textAlign: 'center', fontSize: 10, lineHeight: 13 },
});
