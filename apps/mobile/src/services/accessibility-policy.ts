import type { TextSizePreference } from '@/preferences/accessibility-preferences';

export function textSizeMultiplier(value: TextSizePreference): number {
  if (value === 'large') return 1.15;
  if (value === 'extra_large') return 1.3;
  return 1;
}

export function scaleTextMetrics(
  fontSize: number,
  lineHeight: number,
  multiplier: number,
): { fontSize: number; lineHeight: number } {
  return {
    fontSize: Math.round(fontSize * multiplier),
    lineHeight: Math.round(lineHeight * multiplier),
  };
}
