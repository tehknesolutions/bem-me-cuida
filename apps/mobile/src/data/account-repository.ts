import type { Profile } from '@bemmecuida/domain';

import { LEGAL_VERSIONS, getProfile } from '@/data/profile-repository';
import { supabase } from '@/services/supabase';

export type ConsentType = 'terms' | 'privacy' | 'health_data' | 'analytics' | 'ai_processing';

export type ConsentState = Record<ConsentType, boolean>;

export type AccountDeletionRequest = {
  status: 'requested' | 'cancelled' | 'completed';
  requestedAt: string;
  cancelledAt: string | null;
};

const consentVersions: Record<ConsentType, string> = {
  terms: LEGAL_VERSIONS.terms,
  privacy: LEGAL_VERSIONS.privacy,
  health_data: LEGAL_VERSIONS.healthData,
  analytics: LEGAL_VERSIONS.analytics,
  ai_processing: LEGAL_VERSIONS.aiProcessing,
};

export async function updateProfile(userId: string, displayName: string): Promise<Profile> {
  if (!supabase) throw new Error('supabase_not_configured');
  const normalized = displayName.trim();
  if (normalized.length < 2 || normalized.length > 80) throw new Error('invalid_display_name');

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: normalized })
    .eq('id', userId);
  if (error) throw error;

  const profile = await getProfile(userId);
  if (!profile) throw new Error('profile_not_found');
  return profile;
}

export async function listConsentState(userId: string): Promise<ConsentState> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data, error } = await supabase
    .from('user_consents')
    .select('document_type, granted, granted_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });
  if (error) throw error;

  const state: ConsentState = {
    terms: false,
    privacy: false,
    health_data: false,
    analytics: false,
    ai_processing: false,
  };
  const resolved = new Set<string>();
  for (const row of data ?? []) {
    const type = row.document_type as ConsentType;
    if (!(type in state) || resolved.has(type)) continue;
    state[type] = row.granted === true;
    resolved.add(type);
  }
  return state;
}

export async function setOptionalConsent(
  userId: string,
  type: 'analytics' | 'ai_processing',
  granted: boolean,
): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_consents').upsert({
    user_id: userId,
    document_type: type,
    document_version: consentVersions[type],
    granted,
    granted_at: now,
    revoked_at: granted ? null : now,
  }, { onConflict: 'user_id,document_type,document_version' });
  if (error) throw error;
}

export async function getAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('status, requested_at, cancelled_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    status: data.status as AccountDeletionRequest['status'],
    requestedAt: data.requested_at,
    cancelledAt: data.cancelled_at,
  };
}

export async function requestAccountDeletion(userId: string): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const now = new Date().toISOString();
  const { error } = await supabase.from('account_deletion_requests').upsert({
    user_id: userId,
    status: 'requested',
    requested_at: now,
    cancelled_at: null,
    updated_at: now,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('account_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('user_id', userId)
    .eq('status', 'requested');
  if (error) throw error;
}
