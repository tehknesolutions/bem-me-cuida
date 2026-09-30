import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupportContactInputSchema, saveSupportPlanInputSchema } from './support-plan';
test('aceita um plano pessoal sem exigir conteúdo clínico', () => { const result = saveSupportPlanInputSchema.parse({ warningSigns: ['Ficar muitas horas sem dormir'], immediateActions: ['Ir para um ambiente mais tranquilo'], safePlaces: ['Casa de uma pessoa de confiança'], importantReminder: 'Pedir companhia é uma opção.', groundingReminder: null }); assert.equal(result.warningSigns.length, 1); });
test('rejeita contato sem telefone', () => { assert.equal(createSupportContactInputSchema.safeParse({ name: 'Pessoa de confiança', relationship: null, phone: '', availabilityNotes: null, priority: 1 }).success, false); });
