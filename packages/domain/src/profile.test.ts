import assert from 'node:assert/strict';
import test from 'node:test';
import { completeOnboardingInputSchema, signUpInputSchema } from './index';
test('onboarding exige consentimentos essenciais', () => { const parsed = completeOnboardingInputSchema.safeParse({ displayName: 'Ana', consents: { terms: true, privacy: true, healthData: false, analytics: false, aiProcessing: false } }); assert.equal(parsed.success, false); });
test('cadastro rejeita senhas diferentes', () => { const parsed = signUpInputSchema.safeParse({ email: 'ana@example.com', password: 'senha-segura-123', passwordConfirmation: 'outra-senha-456' }); assert.equal(parsed.success, false); });
