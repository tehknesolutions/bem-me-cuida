import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { CreateMedicationInput } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { MedicationEditor } from '@/components/MedicationEditor';
import { Screen } from '@/components/Screen';
import { saveMedicationWithSchedule } from '@/data/medication-repository';
import { formatLocalDate } from '@/services/care-time';
import { scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';

export default function NewMedicationScreen() {
  const { session } = useAuth();
  const sync = useSync();
  const [saving, setSaving] = useState(false);

  async function handleSave(input: CreateMedicationInput) {
    if (!session) return;
    setSaving(true);
    try {
      const saved = await saveMedicationWithSchedule(input, session.user.id);
      for (const schedule of saved.schedules) {
        if (!schedule.reminderEnabled) continue;
        await scheduleEntityReminders({ userId: session.user.id, entityType: 'medication_schedule', entityId: schedule.id, timeLocal: schedule.timeLocal, weekdaysMask: schedule.weekdaysMask }).catch(() => []);
      }
      void sync.syncNow();
      Alert.alert('Medicamento cadastrado', 'Seu plano foi salvo primeiro neste aparelho.', [{ text: 'Concluir', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Não foi possível salvar', 'Revise os dados e tente novamente.');
    } finally { setSaving(false); }
  }

  return (
    <Screen>
      <BackHeader eyebrow="NOVO MEDICAMENTO" title="Registrar prescrição" titleTestID="new-medication-title" />
      <MedicationEditor
        initial={{ startDate: formatLocalDate(), schedules: [{ timeLocal: '09:00', weekdaysMask: 127, reminderEnabled: false }], stockTrackingEnabled: false, stockQuantity: null, unitsPerIntake: 1, refillThreshold: null, refillReminderEnabled: false }}
        submitLabel="Salvar medicamento"
        saving={saving}
        onSubmit={handleSave}
      />
    </Screen>
  );
}
