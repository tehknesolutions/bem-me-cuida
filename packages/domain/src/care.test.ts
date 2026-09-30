import assert from 'node:assert/strict';
import test from 'node:test';
import { createAppointmentInputSchema, createCarePracticeInputSchema, createMedicationInputSchema, localTimeSchema, weekdayMaskSchema } from './care';

test('aceita horário local válido e rejeita valores fora do relógio', () => { assert.equal(localTimeSchema.safeParse('08:30').success, true); assert.equal(localTimeSchema.safeParse('25:10').success, false); });
test('máscara semanal precisa selecionar ao menos um dia', () => { assert.equal(weekdayMaskSchema.safeParse(127).success, true); assert.equal(weekdayMaskSchema.safeParse(0).success, false); });
test('medicação rejeita período inválido e aceita vários horários', () => {
  const base = { name: 'Medicação de teste', dosageText: '1 unidade', instructions: null, prescriber: null, startDate: '2026-07-24', endDate: null, schedules: [{ timeLocal: '09:00', weekdaysMask: 127, reminderEnabled: true }, { timeLocal: '21:00', weekdaysMask: 127, reminderEnabled: false }], stockTrackingEnabled: false, stockQuantity: null, unitsPerIntake: null, refillThreshold: null, refillReminderEnabled: false };
  assert.equal(createMedicationInputSchema.safeParse(base).success, true); assert.equal(createMedicationInputSchema.safeParse({ ...base, endDate: '2026-07-23' }).success, false);
});
test('estoque exige quantidade, consumo e limite quando ativado', () => { assert.equal(createMedicationInputSchema.safeParse({ name: 'Medicação de teste', dosageText: '1 unidade', instructions: null, prescriber: null, startDate: '2026-07-24', endDate: null, schedules: [{ timeLocal: '09:00', weekdaysMask: 127, reminderEnabled: false }], stockTrackingEnabled: true, stockQuantity: 10, unitsPerIntake: null, refillThreshold: 3, refillReminderEnabled: true }).success, false); });
test('prática exige título e categoria permitida', () => { assert.equal(createCarePracticeInputSchema.safeParse({ title: 'Respiração guiada', category: 'breathing', description: null, targetMinutes: 5, timeLocal: '18:00', weekdaysMask: 127, reminderEnabled: false }).success, true); });
test('consulta exige data ISO e título', () => { assert.equal(createAppointmentInputSchema.safeParse({ professionalId: null, title: 'Consulta', scheduledAt: new Date().toISOString(), durationMinutes: 50, location: null, notes: null, reminderEnabled: true }).success, true); });
