import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { colors, spacing } from '@/theme/tokens';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = true, contentStyle }: Props) {
  const { preferences } = useAppAccessibility();
  const backgroundStyle = preferences.highContrast ? styles.highContrast : null;
  const content = <View style={[styles.content, backgroundStyle, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safe, backgroundStyle]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, backgroundStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  highContrast: { backgroundColor: '#FFFFFF' },
});
