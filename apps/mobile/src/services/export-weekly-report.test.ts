import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReportHtml } from './export-weekly-report';

const input = { startLabel: '24/08', endLabel: '30/08', totalRecords: 22, medicationRecords: 12, practiceRecords: 5, checkInDays: 5, currentTotal: 22, previousTotal: 17, currentMedication: 12, previousMedication: 10, currentPractice: 5, previousPractice: 3, currentCheckIns: 5, previousCheckIns: 4, currentActiveDays: 6, previousActiveDays: 5, days: [{ label: '24/08', total: 3, medication: 2, practice: 1, checkIn: 0 }] };

test('weekly report html contains factual summary and numeric comparison', () => {
  const html = buildWeeklyReportHtml(input);
  assert.match(html, /Relatório semanal/);
  assert.match(html, /22/);
  assert.match(html, />5</);
  assert.match(html, />\+?/);
  assert.match(html, /não constituem avaliação clínica/);
  assert.match(html, /Tehkné Solutions/);
});

test('weekly report html escapes labels', () => {
  const html = buildWeeklyReportHtml({ ...input, startLabel: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});
