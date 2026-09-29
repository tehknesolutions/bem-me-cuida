import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  testIDPrefix?: string;
};

const values = [0, 2, 4, 6, 8, 10];

export function ScaleInput({ label, value, onChange, lowLabel = 'Baixa', highLabel = 'Alta', testIDPrefix }: Props) {
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" muted>{value}/10</AppText>
      </View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {values.map((item) => {
          const selected = item === value;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item} de 10`}
              accessibilityState={{ selected }}
              testID={testIDPrefix ? `${testIDPrefix}-${item}` : undefined}
              onPress={() => onChange(item)}
              style={[styles.value, selected && styles.selected]}
            >
              <AppText variant="caption" style={selected && styles.selectedText}>{item}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <AppText variant="caption" muted>{lowLabel}</AppText>
        <AppText variant="caption" muted>{highLabel}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  value: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  selectedText: { color: colors.white },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
});
