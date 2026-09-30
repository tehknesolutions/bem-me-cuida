const MAX_ERROR_CODE_LENGTH = 80;

export const MAX_SYNC_ATTEMPTS = 8;

export function retryDelayMinutes(attemptCount: number): number {
  const normalized = Math.max(1, Math.trunc(attemptCount));
  return Math.min(2 ** normalized, 60);
}

export function nextRetryAt(attemptCount: number, now = Date.now()): string {
  return new Date(now + retryDelayMinutes(attemptCount) * 60_000).toISOString();
}

export function safeSyncErrorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'unknown_sync_error');
  return raw
    .replace(/[\w.+-]+@[\w.-]+/g, '[email]')
    .replace(/https?:\/\/\S+/g, '[url]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, MAX_ERROR_CODE_LENGTH) || 'unknown_sync_error';
}
