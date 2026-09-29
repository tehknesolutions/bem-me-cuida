import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { createMedicationInputSchema, type CreateMedicationInput, type MedicationScheduleInput } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  initial?: Partial<CreateMedicationInput>;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (input: CreateMedicationInput) => Promise<void>;
  onDeactivate?: () => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);
const defaultSchedule = (): MedicationScheduleInput => ({ timeLocal: '09:00', weekdaysMask: 127, reminderEnabled: false });

export function MedicationEditor({ initial, submitLabel, saving, onSubmit, onDeactivate }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dosageText, setDosageText] = useState(initial?.dosageText ?? '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [prescriber, setPrescriber] = useState(initial?.prescriber ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [schedules, setSchedules] = useState<MedicationScheduleInput[]>(initial?.schedules?.length ? initial.schedules : [defaultSchedule()]);
  const [stockTrackingEnabled, setStockTrackingEnabled] = useState(initial?.stockTrackingEnabled ?? false);
  const [stockQuantity, setStockQuantity] = useState(initial?.stockQuantity?.toString() ?? '');
  const [unitsPerIntake, setUnitsPerIntake] = useState(initial?.unitsPerIntake?.toString() ?? '1');
  const [refillThreshold, setRefillThreshold] = useState(initial?.refillThreshold?.toString() ?? '');
  const [refillReminderEnabled, setRefillReminderEnabled] = useState(initial?.refillReminderEnabled ?? false);
  const [error, setError] = useState<string | null>(null);

  const canAddSchedule = schedules.length < 8;
  const parsedNumbers = useMemo(() => ({
    stockQuantity: stockQuantity.trim() ? Number(stockQuantity.replace(',', '.')) : null,
    unitsPerIntake: unitsPerIntake.trim() ? Number(unitsPerIntake.replace(',', '.')) : null,
    refillThreshold: refillThreshold.trim() ? Number(refillThreshold.replace(',', '.')) : null,
  }), [refillThreshold, stockQuantity, unitsPerIntake]);

  function updateSchedule(index: number, patch: Partial<MedicationScheduleInput>) {
    setSchedules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function submit() {
    setError(null);
    const result = createMedicationInputSchema.safeParse({
      name, dosageText, instructions: instructions.trim() || null, prescriber: prescriber.trim() || null,
      startDate, endDate: endDate.trim() || null, schedules,
      stockTrackingEnabled, stockQuantity: parsedNumbers.stockQuantity,
      unitsPerIntake: parsedNumbers.unitsPerIntake, refillThreshold: parsedNumbers.refillThreshold,
      refillReminderEnabled,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Revise os campos informados.');
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <View style={styles.wrapper}>
      <Surface style={styles.section}>
        <AppText variant="h2">Informações do plano</AppText>
        <TextField label="Nome do medicamento" value={name} onChangeText={setName} autoCapitalize="words" testID="medication-name" />
        <TextField label="Dose descrita na prescrição" value={dosageText} onChangeText={setDosageText} placeholder="Ex.: 1 comprimido" testID="medication-dose" />
        <TextField label="Orientações registradas" value={instructions} onChangeText={setInstructions} multiline />
        <TextField label="Profissional responsável" value={prescriber} onChangeText={setPrescriber} />
        <View style={styles.row}>
          <View style={styles.flex}><TextField label="Início" value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" /></View>
          <View style={styles.flex}><TextField label="Fim (opcional)" value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-DD" /></View>
        </View>
      </Surface>

      <Surface style={styles.section}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <AppText variant="h2">Horários</AppText>
            <AppText variant="caption" muted>Adicione até oito horários definidos no seu plano.</AppText>
          </View>
          <Pressable disabled={!canAddSchedule} onPress={() => setSchedules((current) => [...current, defaultSchedule()])} style={[styles.smallAction, !canAddSchedule && styles.disabled]}>
            <AppText variant="caption" style={styles.actionText}>+ Horário</AppText>
          </Pressable>
        </View>
        {schedules.map((schedule, index) => (
          <View key={schedule.id ?? `new-${index}`} style={styles.scheduleCard}>
            <View style={styles.rowBetween}>
              <AppText variant="bodyStrong">Horário {index + 1}</AppText>
              {schedules.length > 1 ? <Pressable onPress={() => setSchedules((current) => current.filter((_, itemIndex) => itemIndex !== index))}><AppText variant="caption" style={styles.danger}>Remover</AppText></Pressable> : null}
            </View>
            <TextField label="Horário" value={schedule.timeLocal} onChangeText={(value) => updateSchedule(index, { timeLocal: value })} placeholder="09:00" />
            <WeekdaySelector value={schedule.weekdaysMask} onChange={(value) => value > 0 && updateSchedule(index, { weekdaysMask: value })} />
            <View style={styles.switchRow}>
              <View style={styles.flex}><AppText variant="bodyStrong">Lembrete discreto</AppText><AppText variant="caption" muted>Não mostra nome nem dose.</AppText></View>
              <Switch value={schedule.reminderEnabled} onValueChange={(value) => updateSchedule(index, { reminderEnabled: value })} />
            </View>
          </View>
        ))}
      </Surface>

      <Surface style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.flex}><AppText variant="h2">Estoque e reposição</AppText><AppText variant="caption" muted>Opcional. Apenas organiza o que você informou.</AppText></View>
          <Switch value={stockTrackingEnabled} onValueChange={setStockTrackingEnabled} />
        </View>
        {stockTrackingEnabled ? <>
          <View style={styles.row}>
            <View style={styles.flex}><TextField label="Quantidade atual" value={stockQuantity} onChangeText={setStockQuantity} keyboardType="decimal-pad" /></View>
            <View style={styles.flex}><TextField label="Consumo por tomada" value={unitsPerIntake} onChangeText={setUnitsPerIntake} keyboardType="decimal-pad" /></View>
          </View>
          <TextField label="Avisar quando chegar a" value={refillThreshold} onChangeText={setRefillThreshold} keyboardType="decimal-pad" />
          <View style={styles.switchRow}>
            <View style={styles.flex}><AppText variant="bodyStrong">Lembrar da reposição</AppText><AppText variant="caption" muted>Mensagem neutra na tela bloqueada.</AppText></View>
            <Switch value={refillReminderEnabled} onValueChange={setRefillReminderEnabled} />
          </View>
        </> : null}
      </Surface>

      {error ? <AppText style={styles.danger}>{error}</AppText> : null}
      <PrimaryButton label={submitLabel} onPress={() => void submit()} loading={saving ?? false} testID="medication-save" />
      {onDeactivate ? <SecondaryButton label="Desativar sem apagar histórico" onPress={() => void onDeactivate()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scheduleCard: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  smallAction: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionText: { color: colors.primaryStrong }, danger: { color: colors.danger }, disabled: { opacity: 0.45 },
});
