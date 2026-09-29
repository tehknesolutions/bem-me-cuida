import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { scaleTextMetrics } from '@/services/accessibility-policy';
import { colors, typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

type Props = PropsWithChildren<TextProps & { variant?: Variant; muted?: boolean }>;

export function AppText({ variant = 'body', muted = false, style, children, ...props }: Props) {
  const { preferences, fontScale } = useAppAccessibility();
  const metrics = typography[variant];
  const scaled = scaleTextMetrics(metrics.fontSize, metrics.lineHeight, fontScale);

  return (
    <Text
      {...props}
      style={[
        styles.base,
        typography[variant],
        scaled,
        muted && styles.muted,
        preferences.highContrast && styles.highContrast,
        preferences.highContrast && muted && styles.highContrastMuted,
        style,
      ]}
      allowFontScaling
      maxFontSizeMultiplier={2}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text },
  muted: { color: colors.textMuted },
  highContrast: { color: '#111714' },
  highContrastMuted: { color: '#35403B' },
});
