import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { signInInputSchema } from '@bemmecuida/domain';

import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { AppText } from '@/components/AppText';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/services/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function SignInScreen() {
  const { authError } = useLocalSearchParams<{ authError?: string }>();
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const parsed = signInInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    if (!supabase) return;

    setLoading(true);
    setErrors({});
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) Alert.alert('Não foi possível entrar', 'Confira o e-mail e a senha ou recupere seu acesso.');
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <BrandHeader />
        <Surface style={styles.card}>
          <AppText variant="h1" testID="sign-in-title">Bem-vindo de volta</AppText>
          <AppText muted>Entre para acessar seus registros protegidos e continuar seu acompanhamento.</AppText>
          {!configured ? (
            <View style={styles.warning}>
              <AppText variant="bodyStrong" style={styles.warningText}>Backend ainda não configurado</AppText>
              <AppText variant="caption" muted>Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.</AppText>
            </View>
          ) : null}
          {authError === 'recovery_link' ? <AppText variant="caption" style={styles.error}>O link de recuperação não pôde ser validado. Solicite um novo.</AppText> : null}
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" error={errors.email} testID="sign-in-email" />
          <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" error={errors.password} testID="sign-in-password" />
          <Link href="/(auth)/forgot-password" asChild><Pressable accessibilityRole="link"><AppText variant="bodyStrong" style={styles.link}>Esqueci minha senha</AppText></Pressable></Link>
          <PrimaryButton testID="sign-in-submit" label="Entrar" onPress={() => void handleSubmit()} loading={loading} disabled={!configured} />
        </Surface>
        <View style={styles.footer}>
          <AppText muted>Ainda não possui conta?</AppText>
          <Link href="/(auth)/sign-up" asChild><Pressable accessibilityRole="link"><AppText variant="bodyStrong" style={styles.link}>Criar conta</AppText></Pressable></Link>
        </View>
        <Link href="/crisis" asChild><Pressable testID="open-crisis" accessibilityRole="link" style={styles.help}><AppText variant="bodyStrong" style={styles.helpText}>Preciso de ajuda agora</AppText></Pressable></Link>
        <AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, card: { gap: spacing.lg }, footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl }, link: { color: colors.primaryStrong }, help: { alignItems: 'center', marginTop: spacing.xl }, helpText: { color: colors.danger }, signature: { textAlign: 'center', marginTop: spacing.xxxl }, warning: { backgroundColor: colors.sand, padding: spacing.md, gap: spacing.xs, borderRadius: 12 }, warningText: { color: colors.warning }, error: { color: colors.danger },
});
