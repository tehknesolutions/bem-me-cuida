import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { getSupportPlan, listSupportContacts, saveSupportContact, saveSupportPlan, setSupportContactActive } from '@/data/support-plan-repository';
import type { SupportContact } from '@bemmecuida/domain';
import { useSync } from '@/sync/SyncProvider';
import { colors, spacing } from '@/theme/tokens';

function splitLines(value: string, max: number): string[] { return [...new Set(value.split(/\n|,/).map((item) => item.trim()).filter(Boolean))].slice(0, max); }

export default function SupportPlanScreen() {
  const { session } = useAuth(); const sync = useSync();
  const [warningSigns,setWarningSigns]=useState(''); const [actions,setActions]=useState(''); const [safePlaces,setSafePlaces]=useState('');
  const [importantReminder,setImportantReminder]=useState(''); const [groundingReminder,setGroundingReminder]=useState(''); const [contacts,setContacts]=useState<SupportContact[]>([]);
  const [name,setName]=useState(''); const [relationship,setRelationship]=useState(''); const [phone,setPhone]=useState(''); const [availability,setAvailability]=useState(''); const [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{if(!session)return;const [plan,savedContacts]=await Promise.all([getSupportPlan(session.user.id),listSupportContacts(session.user.id)]);if(plan){setWarningSigns(plan.warningSigns.join('\n'));setActions(plan.immediateActions.join('\n'));setSafePlaces(plan.safePlaces.join('\n'));setImportantReminder(plan.importantReminder??'');setGroundingReminder(plan.groundingReminder??'');}setContacts(savedContacts);},[session]);
  useFocusEffect(useCallback(()=>{void load();},[load,sync.lastSuccessAt]));
  async function savePlan(){if(!session)return;setSaving(true);try{await saveSupportPlan({warningSigns:splitLines(warningSigns,10),immediateActions:splitLines(actions,10),safePlaces:splitLines(safePlaces,8),importantReminder:importantReminder.trim()||null,groundingReminder:groundingReminder.trim()||null},session.user.id);void sync.syncNow();Alert.alert('Plano salvo','Ele ficará disponível na tela de apoio mesmo sem internet.');}catch{Alert.alert('Não foi possível salvar','Revise os campos e tente novamente.');}finally{setSaving(false);}}
  async function addContact(){if(!session||!name.trim()||!phone.trim()){Alert.alert('Complete o contato','Informe nome e telefone.');return;}try{await saveSupportContact({name:name.trim(),relationship:relationship.trim()||null,phone:phone.trim(),availabilityNotes:availability.trim()||null,priority:Math.min(5,contacts.length+1)},session.user.id);setName('');setRelationship('');setPhone('');setAvailability('');await load();void sync.syncNow();}catch{Alert.alert('Não foi possível salvar o contato','Revise os dados e tente novamente.');}}
  return <Screen>
    <BackHeader eyebrow="PLANO DE APOIO" title="O que pode ajudar em momentos difíceis" />
    <Surface style={styles.notice}><AppText variant="bodyStrong">Este plano é escrito por você</AppText><AppText variant="caption" muted>Não é uma avaliação de risco e não substitui atendimento profissional ou emergência.</AppText></Surface>
    <Surface style={styles.section}>
      <TextField testID="support-warning-signs" label="Sinais que você costuma perceber" value={warningSigns} onChangeText={setWarningSigns} multiline style={styles.multiline} placeholder="Um por linha. Ex.: muitas horas sem dormir" />
      <TextField label="Ações curtas que costumam ajudar" value={actions} onChangeText={setActions} multiline style={styles.multiline} placeholder="Ex.: ir para um lugar mais calmo" />
      <TextField label="Lugares ou contextos mais seguros" value={safePlaces} onChangeText={setSafePlaces} multiline style={styles.multiline} placeholder="Ex.: casa de uma pessoa de confiança" />
      <TextField label="Lembrete importante para você" value={importantReminder} onChangeText={setImportantReminder} multiline maxLength={500} placeholder="Uma frase curta que você gostaria de ler" />
      <TextField label="Exercício de aterramento preferido" value={groundingReminder} onChangeText={setGroundingReminder} multiline maxLength={500} placeholder="Ex.: nomear coisas que vejo e escuto" />
      <PrimaryButton testID="support-plan-save" label="Salvar plano de apoio" loading={saving} onPress={()=>void savePlan()} />
    </Surface>
    <AppText variant="h2" style={styles.heading}>Contatos de confiança</AppText>
    {contacts.map((contact)=><Surface key={contact.id} style={styles.contact}><View style={styles.flex}><AppText variant="bodyStrong">{contact.name}</AppText><AppText variant="caption" muted>{contact.relationship??'Contato de confiança'} · {contact.phone}</AppText>{contact.availabilityNotes?<AppText variant="caption" muted>{contact.availabilityNotes}</AppText>:null}</View><View style={styles.contactActions}><Pressable onPress={()=>void Linking.openURL(`tel:${contact.phone}`)}><AppText style={styles.call}>Ligar</AppText></Pressable><Pressable onPress={()=>session&&void setSupportContactActive(session.user.id,contact.id,false).then(load)}><AppText variant="caption" muted>Desativar</AppText></Pressable></View></Surface>)}
    <Surface style={styles.section}><AppText variant="bodyStrong">Adicionar contato</AppText><TextField testID="support-contact-name" label="Nome" value={name} onChangeText={setName} maxLength={120}/><TextField label="Relação (opcional)" value={relationship} onChangeText={setRelationship} maxLength={80} placeholder="Ex.: irmã, amigo, terapeuta"/><TextField testID="support-contact-phone" label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={40}/><TextField label="Quando costuma estar disponível" value={availability} onChangeText={setAvailability} maxLength={240} placeholder="Opcional"/><SecondaryButton testID="support-contact-save" label="Adicionar contato de confiança" onPress={()=>void addContact()}/></Surface>
    <PrimaryButton label="Abrir modo de apoio" tone="danger" onPress={()=>router.push('/crisis')} />
    <AppText variant="caption" muted style={styles.footer}>Dados protegidos no aparelho e isolados por conta. Tehkné Solutions.</AppText>
  </Screen>;
}
const styles=StyleSheet.create({notice:{backgroundColor:colors.lavender,gap:spacing.sm,marginBottom:spacing.md},section:{gap:spacing.lg,marginBottom:spacing.lg},multiline:{minHeight:92,textAlignVertical:'top'},heading:{marginBottom:spacing.md},contact:{flexDirection:'row',gap:spacing.md,alignItems:'center',marginBottom:spacing.sm},flex:{flex:1,gap:spacing.xs},contactActions:{alignItems:'flex-end',gap:spacing.md},call:{color:colors.primaryStrong},footer:{textAlign:'center',marginVertical:spacing.xl}});
