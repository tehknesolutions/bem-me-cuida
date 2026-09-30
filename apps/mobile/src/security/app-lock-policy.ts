import type { LockAfterSeconds } from '@/security/account-preferences';

export type AppLockDecisionInput = {
  biometricEnabled: boolean;
  backgroundAt: number | null;
  now: number;
  lockAfterSeconds: LockAfterSeconds;
};

export function shouldRequireAppUnlock(input: AppLockDecisionInput): boolean {
  if (!input.biometricEnabled || input.backgroundAt === null) return false;
  if (input.lockAfterSeconds === 0) return true;
  return input.now - input.backgroundAt >= input.lockAfterSeconds * 1000;
}
