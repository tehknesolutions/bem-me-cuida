export function stockDeltaForIntakeTransition(
  previousStatus: 'taken' | 'skipped' | null,
  nextStatus: 'taken' | 'skipped',
  unitsPerIntake: number,
): number {
  if (previousStatus === nextStatus) return 0;
  if (previousStatus === 'taken' && nextStatus === 'skipped') return unitsPerIntake;
  if (previousStatus !== 'taken' && nextStatus === 'taken') return -unitsPerIntake;
  return 0;
}

export function nextStockQuantity(current: number, delta: number): number {
  return Math.max(0, Number((current + delta).toFixed(3)));
}

export function isRefillDue(options: {
  enabled: boolean;
  quantity: number | null;
  threshold: number | null;
}): boolean {
  return Boolean(options.enabled && options.quantity !== null && options.threshold !== null && options.quantity <= options.threshold);
}
