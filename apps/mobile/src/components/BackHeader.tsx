import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme/tokens';

type Props = { eyebrow: string; title: string; titleTestID?: string };

export function BackHeader({ eyebrow, title, titleTestID }: Props) {
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
        <AppText variant="bodyStrong" style={styles.backText}>← Voltar</AppText>
      </Pressable>
      <AppText variant="caption" muted>{eyebrow}</AppText>
      <AppText variant="h1" testID={titleTestID}>{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginBottom: spacing.xl },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm },
  backText: { color: colors.primaryStrong },
});
