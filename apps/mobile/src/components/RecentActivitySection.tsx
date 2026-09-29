import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { DailyFactualSummary } from '@/components/DailyFactualSummary';
import { Surface } from '@/components/Surface';
import { WeeklyFactualSummary } from '@/components/WeeklyFactualSummary';
import { listRecentActivities, type RecentActivity } from '@/data/recent-activity-repository';
import { colors, radius, spacing } from '@/theme/tokens';

const iconByKind: Record<RecentActivity['kind'], string> = {
  medication: '💊',
  practice: '🌿',
  check_in: '😊',
};

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function RecentActivitySection({ refreshToken }: { refreshToken: string }) {
  const { session } = useAuth();
  const [items, setItems] = useState<RecentActivity[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setItems(await listRecentActivities(session.user.id, 6));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [refreshToken, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <>
      <DailyFactualSummary refreshToken={refreshToken} />
      <WeeklyFactualSummary refreshToken={refreshToken} />

      <View style={styles.headingRow}>
        <AppText variant="h2">Atividade recente</AppText>
        <View style={styles.headingActions}>
          <Pressable accessibilityRole="button" onPress={() => void load()}>
            <AppText variant="caption" style={styles.actionText}>Atualizar</AppText>
          </Pressable>
          <Link href="/care-history" asChild>
            <Pressable testID="home-open-care-history" accessibilityRole="button">
              <AppText variant="caption" style={styles.actionText}>Ver histórico</AppText>
            </Pressable>
          </Link>
        </View>
      </View>
      <Surface testID="home-recent-activity" style={styles.card}>
        {failed ? (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Não foi possível carregar a atividade agora.</AppText>
            <AppText variant="caption" muted>Os registros continuam salvos no aplicativo.</AppText>
          </View>
        ) : items.length ? items.map((item, index) => (
          <Link key={`${item.kind}-${item.id}`} href={item.href} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.detail}, ${timeLabel(item.occurredAt)}, ${item.synced ? 'sincronizado' : 'aguardando sincronização'}`}
              style={[styles.row, index > 0 && styles.divider]}
            >
              <AppText style={styles.icon}>{iconByKind[item.kind]}</AppText>
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <AppText variant="bodyStrong" style={styles.title}>{item.title}</AppText>
                  <AppText variant="caption" muted>{timeLabel(item.occurredAt)}</AppText>
                </View>
                <AppText variant="caption" muted>{item.detail}</AppText>
                <AppText variant="caption" style={item.synced ? styles.synced : styles.pending}>
                  {item.synced ? 'Sincronizado' : 'Aguardando sincronização'}
                </AppText>
              </View>
              <AppText variant="bodyStrong" style={styles.chevron}>›</AppText>
            </Pressable>
          </Link>
        )) : (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Nenhuma atividade registrada ainda.</AppText>
            <AppText variant="caption" muted>Tomadas, práticas e check-ins aparecerão aqui.</AppText>
          </View>
        )}
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md },
  headingActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.md },
  actionText: { color: colors.primaryStrong, fontWeight: '700' },
  card: { paddingVertical: spacing.sm },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { fontSize: 22 },
  content: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  synced: { color: colors.textMuted },
  pending: { alignSelf: 'flex-start', color: colors.primaryStrong, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chevron: { color: colors.textMuted, fontSize: 24 },
  emptyState: { gap: spacing.sm, paddingVertical: spacing.md },
});
