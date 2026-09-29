import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { Appointment, Professional } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { listAppointments, listProfessionals, updateAppointmentStatus } from '@/data/care-management-repository';
import { cancelEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';
function format(value: string) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export default function AppointmentsScreen() {
  const { session } = useAuth(); const sync = useSync(); const [items, setItems] = useState<Appointment[]>([]); const [professionals, setProfessionals] = useState<Professional[]>([]);
  const load = useCallback(async () => { if (!session) return; const [a,p] = await Promise.all([listAppointments(session.user.id, { includePast: true }), listProfessionals(session.user.id)]); setItems(a); setProfessionals(p); }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load, sync.lastSuccessAt]));
  async function setStatus(item: Appointment, status: 'completed'|'cancelled') { if (!session) return; try { await updateAppointmentStatus(session.user.id, item.id, status); await cancelEntityReminders(session.user.id, 'appointment', item.id); await load(); void sync.syncNow(); } catch { Alert.alert('Não foi possível atualizar', 'Tente novamente.'); } }
  const names = new Map(professionals.map((p) => [p.id,p.name]));
  return <Screen><BackHeader eyebrow="CONSULTAS" title="Compromissos de cuidado" /><Link href="/appointments/new" asChild><Pressable style={styles.add}><AppText variant="bodyStrong" style={styles.addText}>+ Adicionar consulta</AppText></Pressable></Link>
  {items.length ? items.map((item) => <Surface key={item.id} style={styles.card}><View style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.title}</AppText><AppText variant="caption" muted>{format(item.scheduledAt)}{item.professionalId ? ` · ${names.get(item.professionalId) ?? 'Profissional'}` : ''}</AppText>{item.location ? <AppText variant="caption" muted>{item.location}</AppText> : null}</View><AppText variant="caption" style={item.status === 'scheduled' ? styles.active : styles.muted}>{item.status === 'scheduled' ? 'Agendada' : item.status === 'completed' ? 'Concluída' : 'Cancelada'}</AppText></View>{item.status === 'scheduled' ? <View style={styles.actions}><View style={styles.flex}><SecondaryButton label="Cancelar" onPress={() => void setStatus(item,'cancelled')} /></View><View style={styles.flex}><SecondaryButton label="Concluir" onPress={() => void setStatus(item,'completed')} /></View></View> : null}</Surface>) : <Surface><AppText muted>Nenhuma consulta registrada.</AppText></Surface>}</Screen>;
}
const styles=StyleSheet.create({ add:{minHeight:52,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primarySoft,marginBottom:spacing.xl},addText:{color:colors.primaryStrong},card:{gap:spacing.md,marginBottom:spacing.md},row:{flexDirection:'row',gap:spacing.md,alignItems:'center'},actions:{flexDirection:'row',gap:spacing.md},flex:{flex:1},active:{color:colors.primaryStrong},muted:{color:colors.textMuted} });
