export type HotfixKind = 'ota' | 'binary';
export type HotfixStatus =
  | 'draft'
  | 'awaiting_approval'
  | 'approved'
  | 'building'
  | 'ready'
  | 'deployed'
  | 'rolled_back'
  | 'cancelled';

export type OtaCompatibilityInput = {
  kind: HotfixKind;
  status: HotfixStatus;
  nativeChanges: boolean;
  requiresBinary: boolean;
  targetRuntimeVersion: string;
  planRuntimeVersion: string;
  targetChannel: string;
  planChannel: string;
  fingerprintSha256: string;
  assetCount: number;
  approvalCount: number;
  rolloutPercentage: number;
};

export type PolicyEvaluation = {
  allowed: boolean;
  blockers: string[];
};

const safeRolloutPercentages = new Set([1, 5, 10, 25, 50, 100]);

export function evaluateOtaCompatibility(input: OtaCompatibilityInput): PolicyEvaluation {
  const blockers: string[] = [];

  if (input.kind !== 'ota') blockers.push('O hotfix selecionado não é do tipo OTA.');
  if (input.status !== 'approved') blockers.push('O hotfix precisa estar aprovado.');
  if (input.nativeChanges || input.requiresBinary) blockers.push('Mudanças nativas exigem um novo binário.');
  if (input.planRuntimeVersion.trim() !== input.targetRuntimeVersion.trim()) {
    blockers.push('O runtime do plano não corresponde ao runtime do binário em produção.');
  }
  if (input.planChannel.trim() !== input.targetChannel.trim()) {
    blockers.push('O canal do plano não corresponde ao canal aprovado.');
  }
  if (!/^[A-Fa-f0-9]{64}$/.test(input.fingerprintSha256.trim())) {
    blockers.push('O fingerprint precisa ser um SHA-256 válido.');
  }
  if (!Number.isInteger(input.assetCount) || input.assetCount < 1 || input.assetCount > 5000) {
    blockers.push('A quantidade de assets precisa estar entre 1 e 5.000.');
  }
  if (input.approvalCount < 1) blockers.push('O plano OTA precisa de aprovação independente.');
  if (!safeRolloutPercentages.has(input.rolloutPercentage)) {
    blockers.push('Use uma onda OTA controlada: 1%, 5%, 10%, 25%, 50% ou 100%.');
  }

  return { allowed: blockers.length === 0, blockers };
}

export function evaluateFourEyesApproval(input: {
  creatorUserId: string;
  approverUserId: string;
  approverRole: string | null | undefined;
  status: string;
}): PolicyEvaluation {
  const blockers: string[] = [];

  if (input.approverRole !== 'release_admin') blockers.push('A decisão exige papel release_admin.');
  if (input.creatorUserId === input.approverUserId) blockers.push('Quem criou não pode aprovar a própria operação.');
  if (input.status !== 'awaiting_approval' && input.status !== 'draft') {
    blockers.push('A operação não está em um estado aprovável.');
  }

  return { allowed: blockers.length === 0, blockers };
}

export const retentionMinimumDays = {
  healthSnapshots: 180,
  operatorAudit: 365,
  incidentUpdates: 730,
} as const;

export function evaluateRetentionExecution(input: {
  isReleaseAdmin: boolean;
  dryRun: boolean;
  confirmation: string;
}): PolicyEvaluation {
  const blockers: string[] = [];

  if (!input.isReleaseAdmin) blockers.push('Somente release_admin pode executar retenção.');
  if (!input.dryRun && input.confirmation.trim() !== 'EXCLUIR DADOS OPERACIONAIS ELEGÍVEIS') {
    blockers.push('A confirmação destrutiva não corresponde ao texto exigido.');
  }

  return { allowed: blockers.length === 0, blockers };
}
