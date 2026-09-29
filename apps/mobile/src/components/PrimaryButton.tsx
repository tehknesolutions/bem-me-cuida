import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'danger';
  testID?: string;
};

export function PrimaryButton({ label, onPress, disabled = false, loading = false, tone = 'primary', testID }: Props) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy: loading }}
      testID={testID}
      onPress={onPress}
      disabled={unavailable}
      style={({ pressed }) => [
        styles.button,
        tone === 'danger' ? styles.danger : styles.primary,
        pressed && styles.pressed,
        unavailable && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <AppText variant="bodyStrong" style={styles.label}>{label}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primaryStrong },
  danger: { backgroundColor: colors.danger },
  label: { color: colors.white },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.48 },
});
