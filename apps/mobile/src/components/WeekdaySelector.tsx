import { StyleSheet, View } from 'react-native';

import { ChoiceChip } from '@/components/ChoiceChip';
import { AppText } from '@/components/AppText';
import { toggleWeekday, weekdayOptions } from '@/services/care-time';
import { spacing } from '@/theme/tokens';

type Props = {
  value: number;
  onChange: (value: number) => void;
};

export function WeekdaySelector({ value, onChange }: Props) {
  return (
    <View style={styles.group}>
      <AppText variant="bodyStrong">Dias da semana</AppText>
      <View style={styles.row}>
        {weekdayOptions.map((day) => (
          <ChoiceChip
            key={day.bit}
            label={day.label}
            accessibilityLabel={day.fullLabel}
            selected={(value & day.bit) !== 0}
            onPress={() => onChange(toggleWeekday(value, day.bit))}
          />
        ))}
      </View>
      <AppText variant="caption" muted>Ao menos um dia deve permanecer selecionado.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
