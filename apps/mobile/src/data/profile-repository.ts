import { profileSchema, type CompleteOnboardingInput, type Profile } from '@bemmecuida/domain';

import { supabase } from '@/services/supabase';

export const LEGAL_VERSIONS = {
  terms: '2026-07-24',
  privacy: '2026-07-24',
  healthData: '2026-07-24',
  analytics: '2026-07-24',
  aiProcessing: '2026-07-24',
} as const;

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, timezone, locale, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return profileSchema.parse({
    id: data.id,
    displayName: data.display_name || 'Pessoa',
    timezone: data.timezone,
    locale: data.locale,
    onboardingCompletedAt: data.onboarding_completed_at,
  });
}

export async function completeOnboarding(userId: string, input: CompleteOnboardingInput): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');

  const consents = [
    { document_type: 'terms', document_version: LEGAL_VERSIONS.terms, granted: input.consents.terms },
    { document_type: 'privacy', document_version: LEGAL_VERSIONS.privacy, granted: input.consents.privacy },
    { document_type: 'health_data', document_version: LEGAL_VERSIONS.healthData, granted: input.consents.healthData },
    { document_type: 'analytics', document_version: LEGAL_VERSIONS.analytics, granted: input.consents.analytics },
    { document_type: 'ai_processing', document_version: LEGAL_VERSIONS.aiProcessing, granted: input.consents.aiProcessing },
  ];

  const { error } = await supabase.rpc('complete_onboarding', {
    p_display_name: input.displayName,
    p_consents: consents,
  });
  if (error) throw error;

  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) throw new Error('onboarding_not_persisted');
}
