import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
  testID?: string;
};

export function CheckboxRow({ checked, label, description, onChange, testID }: Props) {
  const { preferences } = useAppAccessibility();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={description}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}
    >
      <View style={[
        styles.box,
        preferences.highContrast && styles.boxHighContrast,
        checked && styles.boxChecked,
      ]}>
        {checked ? <AppText variant="bodyStrong" style={styles.check}>✓</AppText> : null}
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption" muted>{description}</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.72 },
  focused: { borderColor: colors.primaryStrong },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxHighContrast: { borderWidth: 2, borderColor: '#202A26' },
  boxChecked: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  check: { color: colors.white, lineHeight: 20 },
  copy: { flex: 1, gap: spacing.xs },
});
