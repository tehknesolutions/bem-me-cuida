import type {
  ProductionHealthSnapshot,
  ProductionIncident,
  ProductionRollout,
} from '@/data/production-operations-repository';

export const productionRolloutSteps = [1, 5, 10, 25, 50, 100] as const;
export type ProductionRolloutStep = (typeof productionRolloutSteps)[number];

export type RolloutEvaluation = {
  eligible: boolean;
  blockers: string[];
};

const MAX_HEALTH_AGE_MS = 24 * 60 * 60 * 1000;

export function evaluateProductionRollout(input: {
  rollout: ProductionRollout;
  targetPercent: ProductionRolloutStep;
  latestHealth: ProductionHealthSnapshot | null;
  incidents: ProductionIncident[];
  now?: Date;
}): RolloutEvaluation {
  const blockers: string[] = [];
  const now = input.now ?? new Date();

  if (!['active', 'paused'].includes(input.rollout.status)) blockers.push('O rollout não está ativo ou pausado.');
  if (input.targetPercent <= input.rollout.targetPercent) blockers.push('O próximo percentual precisa ser maior que o atual.');
  if (!productionRolloutSteps.includes(input.targetPercent)) blockers.push('O percentual não pertence à sequência controlada.');

  const criticalOpen = input.incidents.filter(
    (incident) => incident.status !== 'resolved' && (incident.severity === 'sev1' || incident.severity === 'sev2'),
  );
  if (criticalOpen.length > 0) blockers.push(`${criticalOpen.length} incidente(s) crítico(s) em aberto.`);

  const health = input.latestHealth;
  if (!health) {
    blockers.push('Registre uma leitura agregada de saúde antes de avançar.');
  } else {
    const age = now.getTime() - new Date(health.createdAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > MAX_HEALTH_AGE_MS) blockers.push('A leitura agregada de saúde está ausente, futura ou vencida.');
    if (health.crashFreeSessionsPct < 99) blockers.push('Sessões sem falha abaixo de 99%.');
    if (health.syncSuccessPct < 97) blockers.push('Sincronizações bem-sucedidas abaixo de 97%.');
    if (health.authSuccessPct < 98) blockers.push('Autenticações bem-sucedidas abaixo de 98%.');
    if (health.blockerCount > 0) blockers.push(`${health.blockerCount} bloqueador(es) registrado(s) na janela.`);
  }

  return { eligible: blockers.length === 0, blockers };
}
