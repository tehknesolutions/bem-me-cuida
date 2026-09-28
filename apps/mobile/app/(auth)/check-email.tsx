import { Pressable, StyleSheet } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';

import { AppText } from '@/components/AppText';
import { BrandHeader } from '@/components/BrandHeader';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { colors, spacing } from '@/theme/tokens';

export default function CheckEmailScreen() {
  const { email, recovery } = useLocalSearchParams<{ email?: string; recovery?: string }>();
  return (
    <Screen>
      <BrandHeader />
      <Surface style={styles.card}>
        <AppText style={styles.icon}>✉️</AppText>
        <AppText variant="h1" style={styles.center}>Confira seu e-mail</AppText>
        <AppText muted style={styles.center}>
          {recovery === 'true' ? 'Enviamos um link para redefinir sua senha.' : 'Enviamos uma mensagem para confirmar sua conta.'}
          {email ? `\n${email}` : ''}
        </AppText>
        <AppText variant="caption" muted style={styles.center}>O link pode levar alguns minutos. Confira também a pasta de spam.</AppText>
      </Surface>
      <Link href="/(auth)/sign-in" asChild><Pressable accessibilityRole="link" style={styles.back}><AppText variant="bodyStrong" style={styles.link}>Voltar para entrar</AppText></Pressable></Link>
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.lg, alignItems: 'center' }, icon: { fontSize: 48 }, center: { textAlign: 'center' }, back: { alignItems: 'center', marginTop: spacing.xl }, link: { color: colors.primaryStrong } });
