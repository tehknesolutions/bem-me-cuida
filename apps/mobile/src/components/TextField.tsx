import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { AppText } from '@/components/AppText';
import { scaleTextMetrics } from '@/services/accessibility-policy';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string | null | undefined;
  hint?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, style, ...props },
  ref,
) {
  const { preferences, fontScale } = useAppAccessibility();
  const scaled = scaleTextMetrics(16, 23, fontScale);

  return (
    <View style={styles.group}>
      <AppText variant="bodyStrong">{label}</AppText>
      <TextInput
        ref={ref}
        {...props}
        style={[
          styles.input,
          scaled,
          preferences.highContrast && styles.highContrast,
          error && styles.errorInput,
          style,
        ]}
        placeholderTextColor={preferences.highContrast ? '#46524D' : colors.textMuted}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityState={{ disabled: props.editable === false }}
        allowFontScaling
        maxFontSizeMultiplier={2}
      />
      {error ? <AppText variant="caption" style={styles.errorText}>{error}</AppText> : null}
      {!error && hint ? <AppText variant="caption" muted>{hint}</AppText> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  highContrast: {
    borderWidth: 2,
    borderColor: '#202A26',
    color: '#111714',
  },
  errorInput: { borderColor: colors.danger },
  errorText: { color: colors.danger },
});
