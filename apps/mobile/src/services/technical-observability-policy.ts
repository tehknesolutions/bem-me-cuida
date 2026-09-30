export type TechnicalEventContext = Record<string, number | boolean | null>;

const SAFE_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const MAX_CONTEXT_KEYS = 20;

export function sanitizeTechnicalContext(input: Record<string, unknown>): TechnicalEventContext {
  const output: TechnicalEventContext = {};
  for (const [key, value] of Object.entries(input).slice(0, MAX_CONTEXT_KEYS)) {
    if (!SAFE_KEY.test(key)) continue;
    if (typeof value === 'boolean' || value === null) {
      output[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) output[key] = value;
  }
  return output;
}
