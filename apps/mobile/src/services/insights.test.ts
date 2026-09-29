import assert from 'node:assert/strict';
import test from 'node:test';

import type { CheckIn, JournalEntry } from '@bemmecuida/domain';

import { buildContextComparisons, buildWeeklyInsightSummary } from './insights';

const now = '2026-07-25T12:00:00.000Z';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const checkIns: CheckIn[] = [
  {
    id: '11111111-1111-4111-8111-111111111111', userId, occurredAt: now,
    mood: 'neutral', anxiety: 6, energy: 4, irritability: 3, agitation: 4, impulsivity: 2,
    concentration: 5, craving: 0, sleepQuality: 'partial', sleepMinutes: 360, note: null,
    createdAt: now, updatedAt: now,
  },
  {
    id: '22222222-2222-4222-8222-222222222222', userId, occurredAt: now,
    mood: 'good', anxiety: 2, energy: 8, irritability: 1, agitation: 1, impulsivity: 1,
    concentration: 7, craving: 0, sleepQuality: 'good', sleepMinutes: 480, note: null,
    createdAt: now, updatedAt: now,
  },
];

const entries: JournalEntry[] = [{
  id: '33333333-3333-4333-8333-333333333333', userId, occurredAt: now,
  title: null, body: 'Registro', emotions: ['anxiety', 'hope'], intensity: 6,
  triggers: ['Conversa'], strategies: ['Respiração'], forTherapy: true, linkedCheckInId: null,
  createdAt: now, updatedAt: now,
}];

test('resumo calcula médias e emoções mais frequentes', () => {
  const summary = buildWeeklyInsightSummary(checkIns, entries);
  assert.equal(summary.averages.anxiety, 4);
  assert.equal(summary.averages.sleepHours, 7);
  assert.equal(summary.topEmotions.length, 2);
  assert.equal(summary.therapyNotes, 1);
});

test('resumo vazio oferece pergunta de observação', () => {
  const summary = buildWeeklyInsightSummary([], []);
  assert.equal(summary.checkInCount, 0);
  assert.equal(summary.prompts.length, 1);
});

test('comparações exigem amostras mínimas dos dois grupos', () => {
  assert.equal(buildContextComparisons(checkIns, entries).length, 0);
});

test('comparações descrevem sono, intensidade e estratégias sem causalidade', () => {
  const dates = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23'];
  const samples: CheckIn[] = dates.map((date, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    userId,
    occurredAt: `${date}T12:00:00.000Z`,
    mood: index < 2 ? 'low' : 'good',
    anxiety: index < 2 ? 8 : 3,
    energy: index < 2 ? 3 : 7,
    irritability: 3,
    agitation: 3,
    impulsivity: 2,
    concentration: 5,
    craving: 0,
    sleepQuality: index < 2 ? 'poor' : 'good',
    sleepMinutes: index < 2 ? 300 : 480,
    note: null,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  }));
  const journals: JournalEntry[] = dates.map((date, index) => ({
    id: `10000000-0000-4000-8000-00000000000${index}`,
    userId,
    occurredAt: `${date}T18:00:00.000Z`,
    title: null,
    body: `Registro ${index}`,
    emotions: index < 2 ? ['anxiety'] : ['calm'],
    intensity: index < 2 ? 8 : 4,
    triggers: [],
    strategies: index % 2 === 0 ? ['Respiração'] : [],
    forTherapy: false,
    linkedCheckInId: null,
    createdAt: `${date}T18:00:00.000Z`,
    updatedAt: `${date}T18:00:00.000Z`,
  }));

  const comparisons = buildContextComparisons(samples, journals);
  assert.equal(comparisons.some((item) => item.id === 'sleep-anxiety'), true);
  assert.equal(comparisons.some((item) => item.id === 'intensity-anxiety'), true);
  assert.equal(comparisons.some((item) => item.id === 'strategies-intensity'), true);
  assert.equal(comparisons.every((item) => !item.detail.toLowerCase().includes('caus')), true);
});
