import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type { CreateMedicationInput } from '@bemmecuida/domain';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { MedicationEditor } from '@/components/MedicationEditor';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { deactivateMedication, getMedication, updateMedication, type MedicationWithSchedules } from '@/data/medication-repository';
import { cancelEntityReminders, scheduleEntityReminders } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';

export default function EditMedicationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const sync = useSync();
  const [item, setItem] = useState<MedicationWithSchedules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session || !params.id) return;
    void getMedication(session.user.id, params.id).then(setItem).finally(() => setLoading(false));
  }, [params.id, session]);

  const initial = useMemo<Partial<CreateMedicationInput> | undefined>(() => item ? ({
    name: item.name, dosageText: item.dosageText, instructions: item.instructions, prescriber: item.prescriber,
    startDate: item.startDate, endDate: item.endDate,
    schedules: item.schedules.map(({ id, timeLocal, weekdaysMask, reminderEnabled }) => ({ id, timeLocal, weekdaysMask, reminderEnabled })),
    stockTrackingEnabled: item.stockTrackingEnabled, stockQuantity: item.stockQuantity,
    unitsPerIntake: item.unitsPerIntake, refillThreshold: item.refillThreshold,
    refillReminderEnabled: item.refillReminderEnabled,
  }) : undefined, [item]);

  async function handleSave(input: CreateMedicationInput) {
    if (!session || !item) return;
    setSaving(true);
    try {
      for (const schedule of item.schedules) await cancelEntityReminders(session.user.id, 'medication_schedule', schedule.id);
      const updated = await updateMedication({ ...input, id: item.id, active: true }, session.user.id);
      for (const schedule of updated.schedules) if (schedule.reminderEnabled) {
        await scheduleEntityReminders({ userId: session.user.id, entityType: 'medication_schedule', entityId: schedule.id, timeLocal: schedule.timeLocal, weekdaysMask: schedule.weekdaysMask }).catch(() => []);
      }
      void sync.syncNow();
      Alert.alert('Medicamento atualizado', 'O histórico anterior foi preservado.', [{ text: 'Concluir', onPress: () => router.back() }]);
    } catch { Alert.alert('Não foi possível atualizar', 'Tente novamente.'); }
    finally { setSaving(false); }
  }

  async function handleDeactivate() {
    if (!session || !item) return;
    Alert.alert('Desativar medicamento?', 'Os registros anteriores continuarão no histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: () => void (async () => {
        for (const schedule of item.schedules) await cancelEntityReminders(session.user.id, 'medication_schedule', schedule.id);
        await deactivateMedication(session.user.id, item.id);
        void sync.syncNow();
        router.back();
      })() },
    ]);
  }

  return (
    <Screen>
      <BackHeader eyebrow="EDITAR MEDICAMENTO" title={item?.name ?? 'Carregando'} />
      {loading ? <Surface><AppText muted>Carregando plano…</AppText></Surface> : item && initial ? (
        <MedicationEditor initial={initial} submitLabel="Salvar alterações" saving={saving} onSubmit={handleSave} onDeactivate={handleDeactivate} />
      ) : <Surface><AppText muted>Medicamento não encontrado neste aparelho.</AppText></Surface>}
    </Screen>
  );
}
