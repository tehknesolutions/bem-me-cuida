import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Profile } from '@bemmecuida/domain';

import { cacheOnboardingComplete, readCachedOnboarding } from '@/auth/onboarding-cache';
import { getProfile } from '@/data/profile-repository';
import { createSessionFromAuthUrl } from '@/services/auth-linking';
import { supabase } from '@/services/supabase';
import { cancelAllUserReminders } from '@/services/reminders';
import { flushSyncQueue } from '@/services/sync';

type OnboardingStatus = 'loading' | 'incomplete' | 'complete';

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  onboardingStatus: OnboardingStatus;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('loading');

  const hydrateProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setProfile(null);
      setOnboardingStatus('incomplete');
      return;
    }

    setOnboardingStatus('loading');
    const cachedComplete = await readCachedOnboarding(nextSession.user.id);

    try {
      const nextProfile = await getProfile(nextSession.user.id);
      setProfile(nextProfile);
      const complete = Boolean(nextProfile?.onboardingCompletedAt);
      setOnboardingStatus(complete ? 'complete' : 'incomplete');
      if (complete) await cacheOnboardingComplete(nextSession.user.id);
    } catch {
      setOnboardingStatus(cachedComplete ? 'complete' : 'incomplete');
    }
  }, []);

  const refreshProfile = useCallback(async () => { await hydrateProfile(session); }, [hydrateProfile, session]);
  const markOnboardingComplete = useCallback(async () => { if (!session) return; await cacheOnboardingComplete(session.user.id); await hydrateProfile(session); }, [hydrateProfile, session]);
  const signOut = useCallback(async () => { if (!supabase) return; if (session) await cancelAllUserReminders(session.user.id).catch(() => undefined); const { error } = await supabase.auth.signOut(); if (error) throw error; }, [session]);

  useEffect(() => {
    let active = true;
    if (!supabase) { setLoading(false); setOnboardingStatus('incomplete'); return; }
    supabase.auth.getSession().then(({ data }) => { if (!active) return; setSession(data.session); void hydrateProfile(data.session).finally(() => active && setLoading(false)); }).catch(() => active && setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => { if (!active) return; setSession(nextSession); void hydrateProfile(nextSession); if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void flushSyncQueue(); if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password'); });
    const handleUrl = async (url: string | null) => { if (!url) return; try { const result = await createSessionFromAuthUrl(url); if (result.event === 'PASSWORD_RECOVERY') router.replace('/reset-password'); } catch { router.replace({ pathname: '/(auth)/sign-in', params: { authError: 'recovery_link' } }); } };
    void Linking.getInitialURL().then(handleUrl);
    const urlSubscription = Linking.addEventListener('url', ({ url }) => void handleUrl(url));
    return () => { active = false; listener.subscription.unsubscribe(); urlSubscription.remove(); };
  }, [hydrateProfile]);

  const value = useMemo<AuthContextValue>(() => ({ configured: Boolean(supabase), loading, session, profile, onboardingStatus, refreshProfile, markOnboardingComplete, signOut }), [loading, markOnboardingComplete, onboardingStatus, profile, refreshProfile, session, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
