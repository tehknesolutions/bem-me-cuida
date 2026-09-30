import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useAppAccessibility } from '@/accessibility/AccessibilityProvider';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import type { AppAccessibilityPreferences, TextSizePreference } from '@/preferences/accessibility-preferences';
import { colors, spacing } from '@/theme/tokens';
const textSizeOptions:Array<{value:TextSizePreference;label:string}>=[{value:'system',label:'Padrão do sistema'},{value:'large',label:'Grande'},{value:'extra_large',label:'Muito grande'}];
export default function AccessibilitySettingsScreen(){
 const {preferences,updatePreferences}=useAppAccessibility(); const [draft,setDraft]=useState<AppAccessibilityPreferences>(preferences); const [saving,setSaving]=useState(false);
 useEffect(()=>setDraft(preferences),[preferences]);
 async function save(){setSaving(true);try{await updatePreferences(draft);Alert.alert('Acessibilidade atualizada','As preferências foram aplicadas em todo o aplicativo.');}catch{Alert.alert('Não foi possível salvar','Tente novamente.');}finally{setSaving(false);}}
 return <Screen>
  <Pressable testID="accessibility-settings-back" onPress={()=>router.back()} accessibilityRole="button"><AppText variant="bodyStrong">← Voltar</AppText></Pressable>
  <AppText variant="caption" muted style={styles.eyebrow}>ACESSIBILIDADE</AppText><AppText variant="h1" testID="accessibility-settings-title">Uma experiência mais confortável</AppText>
  <AppText muted style={styles.intro}>Ajuste leitura, contraste e movimento. O BemMeCuida também respeita o tamanho de fonte e a redução de movimento definidos no aparelho.</AppText>
  <Surface style={styles.section}><AppText variant="h2">Tamanho do texto</AppText><AppText muted>O ajuste é combinado com as preferências de fonte do sistema.</AppText><View style={styles.chips}>{textSizeOptions.map((option)=><ChoiceChip key={option.value} label={option.label} selected={draft.textSize===option.value} onPress={()=>setDraft((current)=>({...current,textSize:option.value}))}/>)}</View></Surface>
  <Surface style={styles.section}><AppText variant="h2">Contraste e movimento</AppText><CheckboxRow testID="accessibility-high-contrast" checked={draft.highContrast} onChange={(value)=>setDraft((current)=>({...current,highContrast:value}))} label="Aumentar contraste" description="Reforça bordas, campos e legibilidade de textos secundários."/><CheckboxRow testID="accessibility-reduce-motion" checked={draft.reduceMotion} onChange={(value)=>setDraft((current)=>({...current,reduceMotion:value}))} label="Reduzir movimento" description="Remove transições não essenciais e respeita a configuração do aparelho."/></Surface>
  <Surface style={[styles.section,draft.highContrast&&styles.previewHighContrast]}><AppText variant="h2">Prévia de leitura</AppText><AppText>Você pode registrar seu momento com calma. Nenhuma preferência de acessibilidade altera seus dados ou análises.</AppText><AppText variant="caption" muted>Texto secundário para verificar contraste e tamanho.</AppText></Surface>
  <Surface style={styles.section}><AppText variant="h2">Leitores de tela e navegação</AppText><AppText muted>Botões, campos e seletores principais possuem rótulos e estados acessíveis. Para TalkBack, VoiceOver ou controle por voz, use também as configurações do aparelho.</AppText></Surface>
  <PrimaryButton testID="accessibility-settings-save" label="Aplicar preferências" loading={saving} onPress={()=>void save()}/><AppText variant="caption" muted style={styles.signature}>Tehkné Solutions</AppText>
 </Screen>;
}
const styles=StyleSheet.create({eyebrow:{marginTop:spacing.xl},intro:{marginTop:spacing.sm,marginBottom:spacing.xl},section:{gap:spacing.lg,marginBottom:spacing.md},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},previewHighContrast:{borderWidth:3,borderColor:'#111714',backgroundColor:colors.white},signature:{textAlign:'center',marginVertical:spacing.xl}});
