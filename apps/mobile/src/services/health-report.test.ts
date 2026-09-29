import assert from 'node:assert/strict';
import test from 'node:test';

import { buildLongitudinalReport, formatLongitudinalReport } from './health-report';

const emptyInput = {
  periodDays: 7 as const,
  from: '2026-07-19T00:00:00.000Z',
  to: '2026-07-26T00:00:00.000Z',
  checkIns: [], journalEntries: [], medicationIntakes: [], medications: [],
  practiceCompletions: [], practices: [], appointments: [], treatments: [],
};

test('gera relatório vazio sem diagnóstico', () => {
  const report = buildLongitudinalReport(emptyInput);
  const text = formatLongitudinalReport(report, {
    includeMoodAndSymptoms: true, includeSleep: true, includeJournalThemes: true,
    includeCareAdherence: true, includeMedicationNames: false, includeTreatmentNames: false,
  });
  assert.equal(report.checkIns.count, 0);
  assert.match(text, /Não é diagnóstico/);
});

test('não inclui nomes sensíveis sem autorização', () => {
  const report = buildLongitudinalReport({
    ...emptyInput,
    medications: [{
      id: 'bd4b48ca-f7a2-4c74-b274-4f7044f3ecbd', userId: '9b21cd46-7c9e-4adf-a7f6-8b22dbb1f6ad',
      name: 'Medicamento confidencial', dosageText: '1 dose', instructions: null, prescriber: null,
      startDate: '2026-07-01', endDate: null, active: true, stockTrackingEnabled: false,
      stockQuantity: null, unitsPerIntake: null, refillThreshold: null, refillReminderEnabled: false,
      refillReminderLastSentAt: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
    }],
  });
  const hidden = formatLongitudinalReport(report, {
    includeMoodAndSymptoms: false, includeSleep: false, includeJournalThemes: false,
    includeCareAdherence: true, includeMedicationNames: false, includeTreatmentNames: false,
  });
  assert.doesNotMatch(hidden, /Medicamento confidencial/);
});
