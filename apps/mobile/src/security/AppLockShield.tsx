import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { readAppSecurityPreferences } from '@/security/account-preferences';
import { shouldRequireAppUnlock } from '@/security/app-lock-policy';
import { colors, radius, spacing } from '@/theme/tokens';

export function AppLockShield() {
  const { session } = useAuth();
  const { reduceMotion, preferences: accessibility } = useAppAccessibility();
  const [locked, setLocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [message, setMessage] = useState('Confirme sua identidade para acessar seus registros.');
  const backgroundAt = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);
  const authenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (!session || Platform.OS === 'web' || authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    setMessage('Confirme sua identidade para acessar seus registros.');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear BemMeCuida',
        promptDescription: 'Proteja seus registros pessoais e emocionais.',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar código do aparelho',
        biometricsSecurityLevel: 'strong',
      });
      if (result.success) {
        setLocked(false);
        backgroundAt.current = null;
      } else {
        setMessage('Não foi possível desbloquear. Tente novamente quando estiver pronto.');
      }
    } catch {
      setMessage('A autenticação do aparelho não está disponível neste momento.');
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') {
      setLocked(false);
      return;
    }

    let active = true;
    void readAppSecurityPreferences(session.user.id).then(async (preferences) => {
      if (!active || !preferences.biometricEnabled) return;
      const [hardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!active || !hardware || !enrolled) return;
      setLocked(true);
      void authenticate();
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [authenticate, session]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundAt.current = Date.now();
        return;
      }

      if (nextState === 'active' && previousState !== 'active') {
        void readAppSecurityPreferences(session.user.id).then((preferences) => {
          const shouldLock = shouldRequireAppUnlock({
            biometricEnabled: preferences.biometricEnabled,
            backgroundAt: backgroundAt.current,
            now: Date.now(),
            lockAfterSeconds: preferences.lockAfterSeconds,
          });
          if (shouldLock) {
            setLocked(true);
            void authenticate();
          }
        }).catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [authenticate, session]);

  if (!session || Platform.OS === 'web') return null;

  return (
    <Modal visible={locked} animationType={reduceMotion ? 'none' : 'fade'} transparent statusBarTranslucent>
      <View style={[styles.backdrop, accessibility.highContrast && styles.highContrastBackdrop]}>
        <View style={[styles.card, accessibility.highContrast && styles.highContrastCard]}>
          <View style={styles.icon}><AppText variant="display">🔒</AppText></View>
          <AppText variant="h1" style={styles.center}>BemMeCuida bloqueado</AppText>
          <AppText muted style={styles.center}>{message}</AppText>
          <Pressable testID="app-lock-unlock" accessibilityRole="button" disabled={authenticating} onPress={() => void authenticate()} style={({ pressed }) => [styles.button, pressed && styles.pressed, authenticating && styles.disabled]}>
            <AppText variant="bodyStrong" style={styles.buttonText}>{authenticating ? 'Verificando…' : 'Desbloquear'}</AppText>
          </Pressable>
          <AppText variant="caption" muted style={styles.center}>Tehkné Solutions</AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  highContrastBackdrop: { backgroundColor: colors.white },
  card: { width: '100%', maxWidth: 440, gap: spacing.lg, alignItems: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xxl },
  highContrastCard: { borderWidth: 3, borderColor: '#111714' }, icon: { alignItems: 'center' }, center: { textAlign: 'center' },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primaryStrong, paddingHorizontal: spacing.lg },
  buttonText: { color: colors.white }, pressed: { opacity: 0.84 }, disabled: { opacity: 0.48 },
});
