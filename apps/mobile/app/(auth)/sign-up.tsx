import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';

import { signUpInputSchema } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { supabase } from '@/services/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const parsed = signUpInputSchema.safeParse({ email, password, passwordConfirmation: confirmation });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    if (!supabase) return;

    setLoading(true);
    setErrors({});
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: Linking.createURL('/auth/callback') },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Não foi possível concluir', 'Confira os dados ou tente novamente em alguns instantes.');
      return;
    }

    if (!data.session) router.replace({ pathname: '/(auth)/check-email', params: { email: parsed.data.email } });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <BrandHeader compact />
        <Surface style={styles.card}>
          <AppText variant="h1">Crie seu espaço de cuidado</AppText>
          <AppText muted>Seus registros são privados. Você escolhe o que deseja guardar e compartilhar.</AppText>
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" error={errors.email} />
          <TextField label="Senha" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint="Use pelo menos 10 caracteres." error={errors.password} />
          <TextField label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" error={errors.passwordConfirmation} />
          <PrimaryButton label="Criar conta" onPress={() => void handleSubmit()} loading={loading} disabled={!supabase} />
        </Surface>
        <View style={styles.footer}>
          <AppText muted>Já possui conta?</AppText>
          <Link href="/(auth)/sign-in" asChild><Pressable accessibilityRole="link"><AppText variant="bodyStrong" style={styles.link}>Entrar</AppText></Pressable></Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, card: { gap: spacing.lg }, footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl }, link: { color: colors.primaryStrong } });
