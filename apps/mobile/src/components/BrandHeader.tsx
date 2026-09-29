import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme/tokens';

const brandSymbol = require('../../assets/brand-symbol.png');

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.wrapper, compact && styles.compact]}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <Image source={brandSymbol} style={styles.symbol} resizeMode="contain" accessibilityLabel="Símbolo BemMeCuida" />
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <AppText variant={compact ? 'h2' : 'display'}>BemMeCuida</AppText>
        <AppText variant="caption" muted>Cuidar de você. Todo dia.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl },
  compact: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: spacing.xl },
  mark: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  markCompact: { width: 58, height: 58, borderRadius: 29 },
  symbol: { width: '100%', height: '100%' },
  copy: { alignItems: 'center' },
  copyCompact: { alignItems: 'flex-start' },
});
