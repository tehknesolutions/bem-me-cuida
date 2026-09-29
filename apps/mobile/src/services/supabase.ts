import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import { createClient, processLock, type SupportedStorage } from '@supabase/supabase-js';

import { publicEnvironment } from '@/config/environment';
import { secureSessionStorage } from '@/services/secure-storage';

const url = publicEnvironment.supabaseUrl;
const publishableKey = publicEnvironment.supabasePublishableKey;

const webStorage: SupportedStorage = {
  getItem: async (key) => typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
  setItem: async (key, value) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); },
  removeItem: async (key) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); },
};

export const supabase = publicEnvironment.configured && url && publishableKey
  ? createClient(url, publishableKey, {
      auth: {
        storage: Platform.OS === 'web' ? webStorage : secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
