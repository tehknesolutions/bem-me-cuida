import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccessibilityProvider } from '@/accessibility/AccessibilityProvider';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { useDatabaseReady } from '@/hooks/use-database-ready';
import { AppLockShield } from '@/security/AppLockShield';
import { PrivacyShield } from '@/security/PrivacyShield';
import { SyncProvider } from '@/sync/SyncProvider';
import { colors, spacing } from '@/theme/tokens';

function RootNavigator() {
  const database = useDatabaseReady();
  const auth = useAuth();

  if (!database.ready || auth.loading || (auth.session && auth.onboardingStatus === 'loading')) {
    return (
      <View style={styles.loading}>
        {database.error ? (
          <AppText style={styles.center}>{database.error}</AppText>
        ) : (
          <>
            <ActivityIndicator color={colors.primaryStrong} />
            <AppText muted>Preparando seu espaço seguro…</AppText>
          </>
        )}
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!auth.session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(auth.session) && auth.onboardingStatus === 'incomplete'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(auth.session) && auth.onboardingStatus === 'complete'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="medications/index" />
        <Stack.Screen name="medications/new" />
        <Stack.Screen name="routines/index" />
        <Stack.Screen name="routines/new" />
        <Stack.Screen name="care-history" />
        <Stack.Screen name="support-plan" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications-settings" />
        <Stack.Screen name="accessibility-settings" />
      </Stack.Protected>
      <Stack.Screen name="crisis" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/[document]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AccessibilityProvider>
          <PrivacyShield />
          <AppLockShield />
          <SyncProvider><RootNavigator /></SyncProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
  center: { textAlign: 'center' },
});
