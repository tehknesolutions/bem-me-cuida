import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type CareLinkProps = { emoji: string; testID?: string; title: string; description: string; onPress: () => void; };
function CareLink({ emoji, testID, title, description, onPress }: CareLinkProps) {
  return <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.pressed]}><View style={styles.linkIcon}><AppText style={styles.linkEmoji}>{emoji}</AppText></View><View style={styles.flex}><AppText variant="bodyStrong">{title}</AppText><AppText variant="caption" muted>{description}</AppText></View><AppText style={styles.arrow}>›</AppText></Pressable>;
}
export default function CareScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth(); const sync = useSync();
  async function handleSignOut() { try { await signOut(); } catch { Alert.alert('Não foi possível sair', 'Tente novamente.'); } }
  return <Screen><AppText variant="caption" muted>CUIDADO</AppText><AppText variant="h1" style={styles.title}>Seu plano, no seu ritmo</AppText>
    <Surface style={styles.planCard}><AppText variant="h2">Plano de cuidado</AppText><CareLink testID="care-open-medications" emoji="💊" title="Medicamentos" description="Horários, lembretes e registros do que aconteceu." onPress={() => router.push('/medications')} /><CareLink testID="care-open-routines" emoji="🌿" title="Práticas e rotina" description="Exercícios, sono, terapia e outros cuidados possíveis." onPress={() => router.push('/routines')} /><CareLink emoji="🗓️" title="Consultas" description="Compromissos, profissionais e lembretes discretos." onPress={() => router.push('/appointments')} /><CareLink emoji="🤝" title="Tratamentos" description="Organize acompanhamentos sem receber orientação clínica." onPress={() => router.push('/treatments')} /><CareLink testID="care-open-history" emoji="🕊️" title="Histórico" description="Uma linha do tempo sem julgamentos ou pontuação punitiva." onPress={() => router.push('/care-history')} /><CareLink testID="care-open-support-plan" emoji="🛟" title="Plano de apoio" description="Sinais, ações e pessoas de confiança para momentos difíceis." onPress={() => router.push('/support-plan')} /></Surface>
    <Surface style={styles.card}><AppText variant="h2">Sincronização segura</AppText><AppText muted>{sync.status === 'offline' ? 'Sem internet. Seus registros continuam protegidos neste aparelho.' : sync.status === 'syncing' ? 'Enviando e buscando alterações protegidas…' : sync.lastErrorCode ? 'Há uma sincronização pendente. O conteúdo do registro não aparece nos logs.' : 'Seus registros locais e remotos estão sendo mantidos consistentes.'}</AppText><AppText variant="caption" muted>Pendentes: {sync.pending} · Bloqueados após tentativas: {sync.blocked}</AppText><SecondaryButton label="Sincronizar agora" onPress={() => void sync.syncNow()} disabled={sync.status === 'syncing'} /></Surface>
    <Surface style={styles.privacyCard}><AppText variant="bodyStrong">Privacidade por padrão</AppText><AppText variant="caption" muted>Lembretes não exibem nomes de medicamentos, doses ou práticas na tela bloqueada.</AppText></Surface>
    <Surface style={styles.card}><AppText variant="h2">Homologação técnica</AppText><AppText muted>Verifique banco local, armazenamento seguro, sessão, rede e fila sem expor seus dados.</AppText><SecondaryButton testID="care-open-diagnostics" label="Diagnosticar este aparelho" onPress={() => router.push('/diagnostics')} /></Surface>
    <Surface style={styles.card}><AppText variant="h2">Sua conta</AppText><AppText variant="bodyStrong">{profile?.displayName ?? 'Pessoa'}</AppText><AppText variant="caption" muted>{session?.user.email ?? 'E-mail protegido'}</AppText><View style={styles.actions}><View style={styles.flex}><SecondaryButton label="Atualizar perfil" onPress={() => void refreshProfile()} /></View><View style={styles.flex}><PrimaryButton label="Sair" tone="danger" onPress={() => void handleSignOut()} /></View></View></Surface></Screen>;
}
const styles = StyleSheet.create({ title: { marginTop: spacing.xs, marginBottom: spacing.xl }, card: { gap: spacing.sm, marginBottom: spacing.md }, planCard: { gap: spacing.xs, marginBottom: spacing.md }, privacyCard: { gap: spacing.sm, backgroundColor: colors.primarySoft, marginBottom: spacing.md }, actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }, flex: { flex: 1 }, link: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }, pressed: { opacity: 0.7 }, linkIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, linkEmoji: { fontSize: 22 }, arrow: { fontSize: 28, color: colors.textMuted } });
