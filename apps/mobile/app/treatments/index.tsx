import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { Treatment } from '@bemmecuida/domain';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { BackHeader } from '@/components/BackHeader';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Surface } from '@/components/Surface';
import { listTreatments, updateTreatmentStatus } from '@/data/care-management-repository';
import { useSync } from '@/sync/SyncProvider';
import { colors, radius, spacing } from '@/theme/tokens';
export default function TreatmentsScreen(){ const {session}=useAuth(); const sync=useSync(); const [items,setItems]=useState<Treatment[]>([]); const load=useCallback(async()=>{if(session)setItems(await listTreatments(session.user.id,true));},[session]); useFocusEffect(useCallback(()=>{void load();},[load,sync.lastSuccessAt])); async function status(item:Treatment,next:'active'|'paused'|'completed'){if(!session)return;try{await updateTreatmentStatus(session.user.id,item.id,next);await load();void sync.syncNow();}catch{Alert.alert('Não foi possível atualizar','Tente novamente.');}}
return <Screen><BackHeader eyebrow="TRATAMENTOS" title="Acompanhamentos em andamento"/><Link href="/treatments/new" asChild><Pressable style={styles.add}><AppText variant="bodyStrong" style={styles.addText}>+ Adicionar tratamento</AppText></Pressable></Link>{items.length?items.map(item=><Surface key={item.id} style={styles.card}><View style={styles.row}><View style={styles.flex}><AppText variant="bodyStrong">{item.name}</AppText><AppText variant="caption" muted>Desde {item.startDate}{item.endDate?` · até ${item.endDate}`:''}</AppText></View><AppText variant="caption" style={styles.status}>{item.status==='active'?'Ativo':item.status==='paused'?'Pausado':'Concluído'}</AppText></View>{item.description?<AppText muted>{item.description}</AppText>:null}<View style={styles.actions}>{item.status!=='active'?<View style={styles.flex}><SecondaryButton label="Retomar" onPress={()=>void status(item,'active')}/></View>:<View style={styles.flex}><SecondaryButton label="Pausar" onPress={()=>void status(item,'paused')}/></View>}{item.status!=='completed'?<View style={styles.flex}><SecondaryButton label="Concluir" onPress={()=>void status(item,'completed')}/></View>:null}</View></Surface>):<Surface><AppText muted>Nenhum tratamento registrado.</AppText></Surface>}</Screen> }
const styles=StyleSheet.create({add:{minHeight:52,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primarySoft,marginBottom:spacing.xl},addText:{color:colors.primaryStrong},card:{gap:spacing.md,marginBottom:spacing.md},row:{flexDirection:'row',gap:spacing.md,alignItems:'center'},actions:{flexDirection:'row',gap:spacing.md},flex:{flex:1},status:{color:colors.primaryStrong}});
