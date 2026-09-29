import type { TechnicalEvent } from '@/data/technical-event-repository';
import type { DiagnosticReport } from '@/diagnostics/report';
import { supabase } from '@/services/supabase';

export type BetaFeedbackCategory = 'bug' | 'usability' | 'accessibility' | 'performance' | 'idea' | 'other';
export type BetaFeedbackImpact = 'low' | 'medium' | 'high' | 'blocking';
export type BetaFeedbackStatus = 'received' | 'triaged' | 'planned' | 'resolved' | 'closed';
export type BetaTesterStatus = 'active' | 'paused';

export type BetaFeedback = {
  id: string;
  category: BetaFeedbackCategory;
  impact: BetaFeedbackImpact;
  message: string;
  status: BetaFeedbackStatus;
  createdAt: string;
};

export type BetaTesterEnrollment = {
  status: BetaTesterStatus;
  appVersion: string;
  appVariant: string;
  platform: string;
  enrolledAt: string;
  updatedAt: string;
};

export async function submitBetaFeedback(input: {
  userId: string;
  category: BetaFeedbackCategory;
  impact: BetaFeedbackImpact;
  message: string;
  reproductionSteps: string | null;
  diagnostics: DiagnosticReport | null;
  technicalEvents: TechnicalEvent[];
  appVersion: string;
  appVariant: string;
  platform: string;
}): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const message = input.message.trim();
  const reproductionSteps = input.reproductionSteps?.trim() || null;
  if (message.length < 20 || message.length > 2000) throw new Error('invalid_feedback_message');
  if (reproductionSteps && reproductionSteps.length > 2000) throw new Error('invalid_reproduction_steps');

  const { error } = await supabase.from('beta_feedback').insert({
    user_id: input.userId,
    category: input.category,
    impact: input.impact,
    message,
    reproduction_steps: reproductionSteps,
    include_diagnostics: input.diagnostics !== null,
    diagnostic_snapshot: input.diagnostics,
    technical_events: input.technicalEvents,
    app_version: input.appVersion,
    app_variant: input.appVariant,
    platform: input.platform,
    status: 'received',
  });
  if (error) throw error;
}

export async function listBetaFeedback(userId: string): Promise<BetaFeedback[]> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data, error } = await supabase
    .from('beta_feedback')
    .select('id, category, impact, message, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category as BetaFeedbackCategory,
    impact: row.impact as BetaFeedbackImpact,
    message: row.message,
    status: row.status as BetaFeedbackStatus,
    createdAt: row.created_at,
  }));
}

export async function getBetaTesterEnrollment(userId: string): Promise<BetaTesterEnrollment | null> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data, error } = await supabase
    .from('beta_tester_enrollments')
    .select('status, app_version, app_variant, platform, enrolled_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    status: data.status as BetaTesterStatus,
    appVersion: data.app_version,
    appVariant: data.app_variant,
    platform: data.platform,
    enrolledAt: data.enrolled_at,
    updatedAt: data.updated_at,
  };
}

export async function setBetaTesterEnrollment(input: {
  userId: string;
  status: BetaTesterStatus;
  appVersion: string;
  appVariant: string;
  platform: string;
}): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { error } = await supabase.from('beta_tester_enrollments').upsert({
    user_id: input.userId,
    status: input.status,
    app_version: input.appVersion,
    app_variant: input.appVariant,
    platform: input.platform,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}
