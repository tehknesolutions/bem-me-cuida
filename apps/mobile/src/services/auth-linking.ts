import type { AuthChangeEvent } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

export type AuthLinkResult = { event: AuthChangeEvent | 'NONE'; handled: boolean };

function extractParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

export async function createSessionFromAuthUrl(url: string): Promise<AuthLinkResult> {
  if (!supabase) return { event: 'NONE', handled: false };

  const params = extractParams(url);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { event: type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN', handled: true };
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return { event: type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN', handled: true };
  }

  return { event: 'NONE', handled: false };
}
