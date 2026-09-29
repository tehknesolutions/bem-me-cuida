import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { CarePractice } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { listCarePractices, listTodayCarePractices, recordCarePracticeCompletion, type TodayCarePractice } from '@/data/care-practice-repository';
import { careCategoryEmoji, careCategoryLabel } from '@/services/care-labels';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

function timeFromIso(value: string): string { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

export default function RoutinesScreen() {
  const { session } = useAuth(); const sync = useSync(); const [practices, setPractices] = useState<CarePractice[]>([]); const [today, setToday] = useState<TodayCarePractice[]>([]); const [savingId, setSavingId] = useState<string | null>(null);
  const load = useCallback(async () => { if (!session) return; const [allItems, todayItems] = await Promise.all([listCarePractices(session.user.id), listTodayCarePractices(session.user.id)]); setPractices(allItems); setToday(todayItems); }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));
  async function register(item: TodayCarePractice, status: 'completed' | 'skipped') { if (!session) return; setSavingId(item.practice.id); try { await recordCarePracticeCompletion(item, status, session.user.id); await load(); void sync.syncNow(); } catch { Alert.alert('Não foi possível registrar', 'Tente novamente.'); } finally { setSavingId(null); } }
  return <Screen><BackHeader eyebrow="PRÁTICAS E ROTINA" title="Pequenos cuidados possíveis" titleTestID="routines-title" />
    <Surface style={styles.notice}><AppText variant="bodyStrong">Flexível por padrão</AppText><AppText variant="caption" muted>Não há sequência perdida nem punição. Um dia difícil não apaga seu progresso.</AppText></Surface>
    <Link href="/routines/new" asChild><Pressable testID="routines-add" accessibilityRole="button" style={styles.addButton}><AppText variant="bodyStrong" style={styles.addText}>+ Adicionar prática</AppText></Pressable></Link>
    <AppText variant="h2" style={styles.sectionTitle}>Hoje</AppText>{today.length ? today.map((item) => <Surface key={item.practice.id} style={styles.card}><View style={styles.rowBetween}><View style={styles.icon}><AppText>{careCategoryEmoji[item.practice.category]}</AppText></View><View style={styles.flex}><AppText variant="bodyStrong">{item.practice.title}</AppText><AppText variant="caption" muted>{careCategoryLabel[item.practice.category]} · {item.practice.timeLocal ? timeFromIso(item.plannedAt) : 'Sem horário fixo'}</AppText></View><View style={[styles.status, item.completion?.status === 'completed' && styles.statusDone]}><AppText variant="caption" style={item.completion?.status === 'completed' ? styles.statusDoneText : styles.statusText}>{item.completion?.status === 'completed' ? 'Concluído' : item.completion?.status === 'skipped' ? 'Não realizado' : 'Pendente'}</AppText></View></View><View style={styles.actions}><View style={styles.flex}><SecondaryButton label="Hoje não" disabled={savingId === item.practice.id} onPress={() => void register(item, 'skipped')} /></View><View style={styles.flex}><PrimaryButton label="Concluir" loading={savingId === item.practice.id} onPress={() => void register(item, 'completed')} /></View></View></Surface>) : <Surface><AppText muted>Nenhuma prática está programada para hoje.</AppText></Surface>}
    <AppText variant="h2" style={styles.sectionTitle}>Meu plano</AppText>{practices.length ? practices.map((practice) => <Surface key={practice.id} style={styles.card}><Pressable onPress={() => router.push(`/routines/${practice.id}`)}><View style={styles.row}><AppText style={styles.emoji}>{careCategoryEmoji[practice.category]}</AppText><View style={styles.flex}><AppText variant="bodyStrong">{practice.title}</AppText><AppText variant="caption" muted>{careCategoryLabel[practice.category]}{practice.targetMinutes ? ` · ${practice.targetMinutes} min` : ''}</AppText></View><AppText style={styles.arrow}>›</AppText></View></Pressable>{practice.description ? <AppText muted>{practice.description}</AppText> : null}</Surface>) : <Surface><AppText muted>Você ainda não cadastrou práticas terapêuticas ou de autocuidado.</AppText></Surface>}
  </Screen>;
}
const styles = StyleSheet.create({ notice:{backgroundColor:colors.lavender,gap:spacing.sm,marginBottom:spacing.md},addButton:{minHeight:52,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft,borderRadius:radius.md},addText:{color:colors.primaryStrong},sectionTitle:{marginTop:spacing.xl,marginBottom:spacing.md},card:{gap:spacing.sm,marginBottom:spacing.md},rowBetween:{flexDirection:'row',gap:spacing.md,alignItems:'center'},row:{flexDirection:'row',gap:spacing.md,alignItems:'center'},flex:{flex:1},icon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},emoji:{fontSize:24},actions:{flexDirection:'row',gap:spacing.md,marginTop:spacing.sm},status:{borderRadius:radius.pill,backgroundColor:colors.sand,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},statusDone:{backgroundColor:colors.primarySoft},statusText:{color:colors.textMuted},statusDoneText:{color:colors.primaryStrong},arrow:{fontSize:28,color:colors.textMuted} });
