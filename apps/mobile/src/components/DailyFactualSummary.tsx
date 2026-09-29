import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { listTodayCarePractices } from '@/data/care-practice-repository';
import { listRecentCheckIns } from '@/data/check-in-repository';
import { listTodayMedicationDoses } from '@/data/medication-repository';
import { listActivityPage, type RecentActivity } from '@/data/recent-activity-repository';
import { colors, radius, spacing } from '@/theme/tokens';

type DailyFacts = {
  medicationDone: number;
  medicationTotal: number;
  practiceDone: number;
  practiceTotal: number;
  checkInToday: boolean;
  pendingTitles: string[];
  activities: RecentActivity[];
};

const emptyFacts: DailyFacts = {
  medicationDone: 0,
  medicationTotal: 0,
  practiceDone: 0,
  practiceTotal: 0,
  checkInToday: false,
  pendingTitles: [],
  activities: [],
};

function startOfLocalDayIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function sameLocalDay(iso: string): boolean {
  const value = new Date(iso);
  const now = new Date();
  return value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function activityLabel(item: RecentActivity): string {
  if (item.kind === 'medication') return `medicação às ${timeLabel(item.occurredAt)}`;
  if (item.kind === 'practice') return `prática às ${timeLabel(item.occurredAt)}`;
  return `check-in às ${timeLabel(item.occurredAt)}`;
}

export function DailyFactualSummary({ refreshToken }: { refreshToken: string }) {
  const { session } = useAuth();
  const [facts, setFacts] = useState<DailyFacts>(emptyFacts);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [doses, practices, checkIns, activityPage] = await Promise.all([
        listTodayMedicationDoses(session.user.id),
        listTodayCarePractices(session.user.id),
        listRecentCheckIns(session.user.id, 1),
        listActivityPage(session.user.id, { since: startOfLocalDayIso(), limit: 50 }),
      ]);
      const pendingMedicationTitles = doses
        .filter((item) => !item.intake)
        .map((item) => `${item.medication.name} · ${timeLabel(item.plannedAt)}`);
      const pendingPracticeTitles = practices
        .filter((item) => !item.completion)
        .map((item) => `${item.practice.title} · ${timeLabel(item.plannedAt)}`);

      setFacts({
        medicationDone: doses.filter((item) => item.intake?.status === 'taken').length,
        medicationTotal: doses.length,
        practiceDone: practices.filter((item) => item.completion?.status === 'completed').length,
        practiceTotal: practices.length,
        checkInToday: Boolean(checkIns[0] && sameLocalDay(checkIns[0].occurredAt)),
        pendingTitles: [...pendingMedicationTitles, ...pendingPracticeTitles],
        activities: activityPage.items,
      });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [refreshToken, session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const lastActivity = facts.activities[0] ?? null;
  const hasAnyFact = facts.medicationTotal > 0
    || facts.practiceTotal > 0
    || facts.checkInToday
    || facts.pendingTitles.length > 0
    || facts.activities.length > 0;

  return (
    <>
      <View style={styles.headingRow}>
        <AppText variant="h2">Resumo de hoje</AppText>
        <Link href="/care-history" asChild>
          <Pressable testID="home-open-daily-history" accessibilityRole="button">
            <AppText variant="caption" style={styles.linkText}>Ver detalhes</AppText>
          </Pressable>
        </Link>
      </View>

      <Surface testID="home-daily-factual-summary" style={styles.card}>
        {failed ? (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Não foi possível atualizar o resumo agora.</AppText>
            <AppText variant="caption" muted>Os demais dados da Home continuam disponíveis.</AppText>
          </View>
        ) : hasAnyFact ? (
          <>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>💊</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{facts.medicationDone} de {facts.medicationTotal} medicações registradas</AppText>
                <AppText variant="caption" muted>Somente doses programadas para hoje.</AppText>
              </View>
            </View>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>🌿</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{facts.practiceDone} de {facts.practiceTotal} práticas concluídas</AppText>
                <AppText variant="caption" muted>Somente práticas programadas para hoje.</AppText>
              </View>
            </View>
            <View style={styles.factRow}>
              <AppText style={styles.icon}>😊</AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{facts.checkInToday ? 'Check-in registrado hoje' : 'Nenhum check-in registrado hoje'}</AppText>
                {lastActivity ? <AppText variant="caption" muted>Última atividade: {activityLabel(lastActivity)}</AppText> : null}
              </View>
            </View>

            {facts.pendingTitles.length ? (
              <View style={styles.pendingBox}>
                <AppText variant="bodyStrong">Ainda para hoje</AppText>
                {facts.pendingTitles.slice(0, 3).map((title) => (
                  <AppText key={title} variant="caption" muted>○ {title}</AppText>
                ))}
                {facts.pendingTitles.length > 3 ? <AppText variant="caption" muted>+ {facts.pendingTitles.length - 3} outro(s) item(ns)</AppText> : null}
              </View>
            ) : (
              <View style={styles.completeBox}>
                <AppText variant="caption" style={styles.completeText}>Nenhuma medicação ou prática programada permanece pendente.</AppText>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="bodyStrong">Nenhum registro feito hoje.</AppText>
            <AppText variant="caption" muted>Check-ins, tomadas e práticas aparecerão aqui conforme forem registrados.</AppText>
          </View>
        )}
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  linkText: { color: colors.primaryStrong, fontWeight: '700' },
  card: { gap: spacing.md },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { fontSize: 22 },
  flex: { flex: 1, gap: spacing.xs },
  pendingBox: { gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  completeBox: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md },
  completeText: { color: colors.primaryStrong },
  emptyState: { gap: spacing.sm, paddingVertical: spacing.sm },
});
