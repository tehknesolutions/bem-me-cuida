import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { CreateCarePracticeInput } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { PracticeEditor } from '@/components/PracticeEditor';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { deactivateCarePractice, getCarePractice, updateCarePractice } from '@/data/care-practice-repository';
import { cancelEntityReminders, scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { session } = useAuth(); const sync = useSync();
  const [item, setItem] = useState<Awaited<ReturnType<typeof getCarePractice>>>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!session || !id) return; void getCarePractice(session.user.id, id).then(setItem).finally(() => setLoading(false)); }, [id, session]);
  const initial = useMemo<Partial<CreateCarePracticeInput> | undefined>(() => item ? ({ title: item.title, category: item.category, description: item.description, targetMinutes: item.targetMinutes, timeLocal: item.timeLocal, weekdaysMask: item.weekdaysMask, reminderEnabled: item.reminderEnabled }) : undefined, [item]);
  async function save(input: CreateCarePracticeInput) { if (!session || !item) return; setSaving(true); try { await cancelEntityReminders(session.user.id, 'care_practice', item.id); const updated = await updateCarePractice({ ...input, id: item.id, active: true }, session.user.id); if (updated.reminderEnabled && updated.timeLocal) await scheduleEntityReminders({ userId: session.user.id, entityType: 'care_practice', entityId: updated.id, timeLocal: updated.timeLocal, weekdaysMask: updated.weekdaysMask }).catch(() => []); void sync.syncNow(); router.back(); } catch { Alert.alert('Não foi possível atualizar', 'Tente novamente.'); } finally { setSaving(false); } }
  async function deactivate() { if (!session || !item) return; Alert.alert('Desativar prática?', 'O histórico será preservado.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Desativar', style: 'destructive', onPress: () => void (async () => { await cancelEntityReminders(session.user.id, 'care_practice', item.id); await deactivateCarePractice(session.user.id, item.id); void sync.syncNow(); router.back(); })() }]); }
  return <Screen><BackHeader eyebrow="EDITAR PRÁTICA" title={item?.title ?? 'Carregando'} />{loading ? <Surface><AppText muted>Carregando…</AppText></Surface> : item && initial ? <PracticeEditor initial={initial} submitLabel="Salvar alterações" saving={saving} onSubmit={save} onDeactivate={deactivate} /> : <Surface><AppText muted>Prática não encontrada.</AppText></Surface>}</Screen>;
}
