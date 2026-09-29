export const EVERY_DAY_MASK = 127;

export const weekdayOptions = [
  { bit: 1, label: 'D', fullLabel: 'Domingo' },
  { bit: 2, label: 'S', fullLabel: 'Segunda' },
  { bit: 4, label: 'T', fullLabel: 'Terça' },
  { bit: 8, label: 'Q', fullLabel: 'Quarta' },
  { bit: 16, label: 'Q', fullLabel: 'Quinta' },
  { bit: 32, label: 'S', fullLabel: 'Sexta' },
  { bit: 64, label: 'S', fullLabel: 'Sábado' },
] as const;

export function maskIncludesDate(mask: number, date: Date): boolean {
  return (mask & (1 << date.getDay())) !== 0;
}

export function toggleWeekday(mask: number, bit: number): number {
  const next = mask ^ bit;
  return next === 0 ? mask : next;
}

export function dateAtLocalTime(date: Date, timeLocal: string | null): Date {
  const result = new Date(date);
  const [hour = 9, minute = 0] = (timeLocal ?? '09:00').split(':').map(Number);
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function startOfLocalDay(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfLocalDay(date = new Date()): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeLabel(timeLocal: string | null): string {
  return timeLocal ?? 'Sem horário';
}
