import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { getLocalSyncState, type LocalSyncState } from '@/data/sync-state-repository';
import { reconcileCareReminders } from '@/services/reminders';
import { runSyncCycle } from '@/services/sync';

export type SyncVisualStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

type SyncContextValue = LocalSyncState & {
  status: SyncVisualStatus;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const emptyState: LocalSyncState = { pending: 0, blocked: 0, lastSuccessAt: null, lastAttemptAt: null, lastErrorCode: null, remoteCursor: null, remoteCursorId: null };
const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { session, onboardingStatus } = useAuth();
  const userId = session?.user.id ?? null;
  const [localState, setLocalState] = useState<LocalSyncState>(emptyState);
  const [status, setStatus] = useState<SyncVisualStatus>('idle');
  const running = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setLocalState(emptyState); return; }
    setLocalState(await getLocalSyncState(userId));
  }, [userId]);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!userId || onboardingStatus !== 'complete') return;
    if (running.current) { await running.current; return; }
    const task = (async () => {
      const network = await Network.getNetworkStateAsync();
      if (network.isConnected === false || network.isInternetReachable === false) { setStatus('offline'); await refresh(); return; }
      setStatus('syncing');
      try {
        await runSyncCycle(userId);
        await reconcileCareReminders(userId).catch(() => 0);
        await refresh();
        setStatus('synced');
      } catch {
        await refresh();
        setStatus('error');
      }
    })();
    running.current = task;
    try { await task; } finally { running.current = null; }
  }, [onboardingStatus, refresh, userId]);

  useEffect(() => {
    void refresh();
    if (!userId || onboardingStatus !== 'complete') { setStatus('idle'); return; }
    void syncNow();
    const appState = AppState.addEventListener('change', (nextState) => { if (nextState === 'active') void syncNow(); });
    const network = Network.addNetworkStateListener((nextState) => {
      if (nextState.isConnected && nextState.isInternetReachable !== false) void syncNow();
      if (nextState.isConnected === false || nextState.isInternetReachable === false) setStatus('offline');
    });
    const interval = setInterval(() => void syncNow(), 120_000);
    return () => { appState.remove(); network.remove(); clearInterval(interval); };
  }, [onboardingStatus, refresh, syncNow, userId]);

  const value = useMemo<SyncContextValue>(() => ({ ...localState, status, refresh, syncNow }), [localState, refresh, status, syncNow]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const value = useContext(SyncContext);
  if (!value) throw new Error('useSync deve ser usado dentro de SyncProvider.');
  return value;
}
