import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { saveProfessional, saveTreatment } from '@/data/care-management-repository';
import { formatLocalDate } from '@/services/care-time';
import { useSync } from '@/sync/SyncProvider';
import { spacing } from '@/theme/tokens';
export default function NewTreatmentScreen(){ const {session}=useAuth(); const sync=useSync(); const [name,setName]=useState(''); const [professional,setProfessional]=useState(''); const [description,setDescription]=useState(''); const [startDate,setStartDate]=useState(formatLocalDate()); const [endDate,setEndDate]=useState(''); const [notes,setNotes]=useState(''); const [saving,setSaving]=useState(false);
async function save(){ if(!session)return; setSaving(true); try{ const person=professional.trim()?await saveProfessional({name:professional,specialty:null,phone:null,email:null,notes:null},session.user.id):null; await saveTreatment({professionalId:person?.id??null,name,description:description.trim()||null,startDate,endDate:endDate.trim()||null,status:'active',notes:notes.trim()||null},session.user.id); void sync.syncNow(); router.back(); }catch{Alert.alert('Não foi possível salvar','Revise os dados.');}finally{setSaving(false);} }
return <Screen><BackHeader eyebrow="NOVO TRATAMENTO" title="Organizar acompanhamento"/><Surface style={styles.section}><TextField label="Nome do tratamento" value={name} onChangeText={setName}/><TextField label="Profissional" value={professional} onChangeText={setProfessional} placeholder="Opcional"/><TextField label="Descrição" value={description} onChangeText={setDescription} multiline/><TextField label="Data inicial" value={startDate} onChangeText={setStartDate}/><TextField label="Data final" value={endDate} onChangeText={setEndDate} placeholder="Opcional"/><TextField label="Notas" value={notes} onChangeText={setNotes} multiline/></Surface><PrimaryButton label="Salvar tratamento" loading={saving} onPress={()=>void save()}/></Screen> }
const styles=StyleSheet.create({section:{gap:spacing.lg,marginBottom:spacing.md}});
