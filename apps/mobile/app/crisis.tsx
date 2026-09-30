import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { SupportContact, SupportPlan } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { getSupportPlan, listSupportContacts } from '@/data/support-plan-repository';
import { colors, radius, spacing } from '@/theme/tokens';

const publicContacts = [
  { label: 'CVV — apoio emocional', detail: '188 · atendimento gratuito', phone: '188' },
  { label: 'SAMU — emergência médica', detail: '192', phone: '192' },
];

export default function CrisisScreen() {
  const { session } = useAuth();
  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [trustedContacts, setTrustedContacts] = useState<SupportContact[]>([]);

  const load = useCallback(async () => {
    if (!session) { setPlan(null); setTrustedContacts([]); return; }
    const [savedPlan, contacts] = await Promise.all([
      getSupportPlan(session.user.id), listSupportContacts(session.user.id),
    ]);
    setPlan(savedPlan); setTrustedContacts(contacts);
  }, [session]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
      <View style={styles.hero}>
        <AppText style={styles.icon}>🤝</AppText>
        <AppText variant="h1" testID="crisis-title" style={styles.center}>Você não precisa atravessar este momento sozinho.</AppText>
        <AppText muted style={styles.center}>Este espaço organiza caminhos de apoio. Em risco imediato, procure um local seguro e um serviço de emergência.</AppText>
      </View>
      <Surface style={styles.section}>
        <AppText variant="h2">Você está em segurança agora?</AppText>
        <AppText muted>Se a resposta for não, ligue para a emergência ou peça para alguém permanecer com você.</AppText>
        <PrimaryButton testID="crisis-call-samu" label="Ligar para o SAMU 192" tone="danger" onPress={() => void Linking.openURL('tel:192')} />
      </Surface>
      {plan ? <>
        {plan.importantReminder ? <Surface style={styles.personal}><AppText variant="h2">Seu lembrete</AppText><AppText>{plan.importantReminder}</AppText></Surface> : null}
        {plan.immediateActions.length ? <Surface style={styles.section}><AppText variant="h2">Ações que você escolheu</AppText>{plan.immediateActions.map((item) => <AppText key={item}>• {item}</AppText>)}</Surface> : null}
        {plan.safePlaces.length ? <Surface style={styles.section}><AppText variant="h2">Lugares ou contextos mais seguros</AppText>{plan.safePlaces.map((item) => <AppText key={item}>• {item}</AppText>)}</Surface> : null}
        {plan.groundingReminder ? <Surface style={styles.section}><AppText variant="h2">Seu exercício de aterramento</AppText><AppText muted>{plan.groundingReminder}</AppText></Surface> : null}
      </> : session ? <Pressable onPress={() => router.push('/support-plan')} style={styles.setup}><AppText variant="bodyStrong" style={styles.call}>Criar meu plano de apoio</AppText></Pressable> : null}
      {trustedContacts.length ? <><AppText variant="h2" style={styles.title}>Pessoas de confiança</AppText><View style={styles.list}>{trustedContacts.map((contact) => <Pressable key={contact.id} accessibilityRole="button" onPress={() => void Linking.openURL(`tel:${contact.phone}`)} style={styles.contact}><View style={styles.flex}><AppText variant="bodyStrong">{contact.name}</AppText><AppText variant="caption" muted>{contact.relationship ?? 'Contato de confiança'} · {contact.phone}</AppText></View><AppText variant="bodyStrong" style={styles.call}>Ligar</AppText></Pressable>)}</View></> : null}
      <AppText variant="h2" style={styles.title}>Contatos públicos de apoio</AppText>
      <View style={styles.list}>{publicContacts.map((contact) => <Pressable key={contact.phone} accessibilityRole="button" onPress={() => void Linking.openURL(`tel:${contact.phone}`)} style={styles.contact}><View style={styles.flex}><AppText variant="bodyStrong">{contact.label}</AppText><AppText variant="caption" muted>{contact.detail}</AppText></View><AppText variant="bodyStrong" style={styles.call}>Ligar</AppText></Pressable>)}</View>
      <Surface style={styles.section}><AppText variant="h2">Enquanto o apoio chega</AppText><AppText muted>Olhe ao redor e nomeie 5 coisas que vê, 4 que pode tocar, 3 que escuta, 2 que sente pelo olfato e 1 gosto. Isso não substitui ajuda, mas pode ajudar a atravessar os próximos minutos.</AppText></Surface>
      <AppText variant="caption" muted style={styles.disclaimer}>O BemMeCuida não é um serviço de emergência. Tehkné Solutions.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }, icon: { fontSize: 52 }, center: { textAlign: 'center' },
  section: { gap: spacing.md, marginBottom: spacing.lg }, personal: { gap: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.lavender },
  setup: { padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft, marginBottom: spacing.lg, alignItems: 'center' },
  title: { marginBottom: spacing.md }, list: { gap: spacing.sm, marginBottom: spacing.lg },
  contact: { flexDirection: 'row', alignItems: 'center', minHeight: 68, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1, gap: spacing.xs }, call: { color: colors.primaryStrong }, disclaimer: { textAlign: 'center', marginVertical: spacing.xl },
});
