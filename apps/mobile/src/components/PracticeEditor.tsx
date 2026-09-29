import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { carePracticeCategoryValues, createCarePracticeInputSchema, type CarePracticeCategory, type CreateCarePracticeInput } from '@bemmecuida/domain';
import { AppText } from '@/components/AppText';
import { CheckboxRow } from '@/components/CheckboxRow';
import { ChoiceChip } from '@/components/ChoiceChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { careCategoryEmoji, careCategoryLabel } from '@/services/care-labels';
import { spacing } from '@/theme/tokens';
type Props={initial?:Partial<CreateCarePracticeInput>;saving?:boolean;submitLabel:string;onSubmit:(input:CreateCarePracticeInput)=>Promise<void>;onDeactivate?:()=>Promise<void>};
const defaultForm:CreateCarePracticeInput={title:'',category:'custom',description:null,targetMinutes:null,timeLocal:null,weekdaysMask:127,reminderEnabled:false};
export function PracticeEditor({initial,saving,submitLabel,onSubmit,onDeactivate}:Props){
  const [form,setForm]=useState<CreateCarePracticeInput>({...defaultForm,...initial}); const [error,setError]=useState<string|null>(null);
  function update<K extends keyof CreateCarePracticeInput>(key:K,value:CreateCarePracticeInput[K]){setForm(current=>({...current,[key]:value}));}
  async function submit(){const parsed=createCarePracticeInputSchema.safeParse(form);if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revise os dados.');return;}setError(null);await onSubmit(parsed.data);}
  return <View style={styles.wrapper}>
    <Surface style={styles.section}>
      <TextField testID="routine-name" label="Nome da prática" value={form.title} onChangeText={(value)=>update('title',value)} maxLength={120}/>
      <AppText variant="bodyStrong">Categoria</AppText>
      <View style={styles.chips}>{carePracticeCategoryValues.map((category)=><ChoiceChip key={category} label={`${careCategoryEmoji[category]} ${careCategoryLabel[category]}`} selected={form.category===category} onPress={()=>update('category',category as CarePracticeCategory)}/>)}</View>
      <TextField label="Descrição" value={form.description??''} onChangeText={(value)=>update('description',value.trim()?value:null)} multiline maxLength={300}/>
      <TextField label="Duração estimada" value={form.targetMinutes?.toString()??''} onChangeText={(value)=>update('targetMinutes',value?Number(value.replace(/\D/g,''))||null:null)} keyboardType="number-pad"/>
    </Surface>
    <Surface style={styles.section}>
      <TextField label="Horário" value={form.timeLocal??''} onChangeText={(value)=>update('timeLocal',value.trim()?value:null)} placeholder="Opcional · HH:mm"/>
      <WeekdaySelector value={form.weekdaysMask} onChange={(value)=>value>0&&update('weekdaysMask',value)}/>
      <CheckboxRow checked={form.reminderEnabled} onChange={(value)=>update('reminderEnabled',value)} label="Lembrete discreto" description="Não revela a prática na tela bloqueada."/>
    </Surface>
    {error?<AppText style={styles.error}>{error}</AppText>:null}
    <PrimaryButton testID="routine-save" label={submitLabel} loading={saving??false} onPress={()=>void submit()}/>
    {onDeactivate?<SecondaryButton label="Desativar sem apagar histórico" onPress={()=>void onDeactivate()}/>:null}
  </View>;
}
const styles=StyleSheet.create({wrapper:{gap:spacing.md,paddingBottom:spacing.xl},section:{gap:spacing.lg},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},error:{color:'#A23B3B'}});
