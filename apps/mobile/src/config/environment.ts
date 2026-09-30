export type PublicEnvironment = {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
  configured: boolean;
  problem: 'missing' | 'invalid_url' | 'administrative_key' | null;
};

export function parsePublicEnvironment(input: Record<string, string | undefined>): PublicEnvironment {
  const supabaseUrl = input.EXPO_PUBLIC_SUPABASE_URL?.trim() || null;
  const supabasePublishableKey = input.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null;

  if (!supabaseUrl || !supabasePublishableKey) {
    return { supabaseUrl, supabasePublishableKey, configured: false, problem: 'missing' };
  }

  try {
    const parsed = new URL(supabaseUrl);
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !local) {
      return { supabaseUrl, supabasePublishableKey, configured: false, problem: 'invalid_url' };
    }
  } catch {
    return { supabaseUrl, supabasePublishableKey, configured: false, problem: 'invalid_url' };
  }

  if (/service_role|sb_secret_/i.test(supabasePublishableKey)) {
    return { supabaseUrl, supabasePublishableKey: null, configured: false, problem: 'administrative_key' };
  }

  return { supabaseUrl, supabasePublishableKey, configured: true, problem: null };
}

export const publicEnvironment = parsePublicEnvironment({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
