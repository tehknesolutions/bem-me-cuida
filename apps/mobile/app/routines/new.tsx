import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import type { CreateCarePracticeInput } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { PracticeEditor } from '@/components/PracticeEditor';
import { Screen } from '@/components/Screen';
import { saveCarePractice } from '@/data/care-practice-repository';
import { scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
export default function NewRoutineScreen() {
  const { session } = useAuth(); const sync = useSync(); const [saving, setSaving] = useState(false);
  async function handleSave(input: CreateCarePracticeInput) { if (!session) return; setSaving(true); try { const practice = await saveCarePractice(input, session.user.id); if (practice.reminderEnabled && practice.timeLocal) await scheduleEntityReminders({ userId: session.user.id, entityType: 'care_practice', entityId: practice.id, timeLocal: practice.timeLocal, weekdaysMask: practice.weekdaysMask }).catch(() => []); void sync.syncNow(); Alert.alert('Prática adicionada', 'Ela já aparece no seu plano.', [{ text: 'Concluir', onPress: () => router.back() }]); } catch { Alert.alert('Não foi possível salvar', 'Tente novamente.'); } finally { setSaving(false); } }
  return <Screen><BackHeader eyebrow="NOVA PRÁTICA" title="Adicionar um cuidado possível" titleTestID="new-routine-title" /><PracticeEditor submitLabel="Salvar prática" saving={saving} onSubmit={handleSave} /></Screen>;
}
