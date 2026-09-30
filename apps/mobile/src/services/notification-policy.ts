export type QuietHours = {
  enabled: boolean;
  startLocal: string;
  endLocal: string;
};

function minutesFromTimeLocal(value: string): number {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function timeLocalFromDate(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function isWithinQuietHours(timeLocal: string, quietHours: QuietHours): boolean {
  if (!quietHours.enabled) return false;
  const value = minutesFromTimeLocal(timeLocal);
  const start = minutesFromTimeLocal(quietHours.startLocal);
  const end = minutesFromTimeLocal(quietHours.endLocal);

  if (start === end) return true;
  if (start < end) return value >= start && value < end;
  return value >= start || value < end;
}

export function normalizeTimeLocal(value: string, fallback: string): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? value.trim() : fallback;
}
