import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

import { emailSchema } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { supabase } from '@/services/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErrorText(parsed.error.issues[0]?.message ?? 'Informe um e-mail válido.');
      return;
    }
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    setLoading(false);
    if (error) {
      Alert.alert('Não foi possível enviar', 'Tente novamente mais tarde.');
      return;
    }
    router.replace({ pathname: '/(auth)/check-email', params: { email: parsed.data, recovery: 'true' } });
  }

  return (
    <Screen>
      <BrandHeader compact />
      <Surface style={styles.card}>
        <AppText variant="h1">Recuperar acesso</AppText>
        <AppText muted>Enviaremos um link de uso único. Por segurança, o aplicativo não informa se o e-mail está cadastrado.</AppText>
        <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={errorText} />
        <PrimaryButton label="Enviar link" onPress={() => void handleSubmit()} loading={loading} disabled={!supabase} />
      </Surface>
      <Link href="/(auth)/sign-in" asChild><Pressable accessibilityRole="link" style={styles.back}><AppText variant="bodyStrong" style={styles.link}>Voltar para entrar</AppText></Pressable></Link>
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.lg }, back: { alignItems: 'center', marginTop: spacing.xl }, link: { color: colors.primaryStrong } });
