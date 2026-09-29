import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { BackHeader } from '@/components/BackHeader';
import { CheckboxRow } from '@/components/CheckboxRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { saveAppointment, saveProfessional } from '@/data/care-management-repository';
import { scheduleAppointmentReminder } from '@/services/reminders';
import { useSync } from '@/sync/SyncProvider';
import { spacing } from '@/theme/tokens';

function parseLocalDateTime(value: string): string | null {
  const normalized = value.trim().replace(' ', 'T');
  const date = new Date(normalized.length === 16 ? `${normalized}:00` : normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function NewAppointmentScreen() {
  const { session } = useAuth(); const sync = useSync();
  const [title, setTitle] = useState(''); const [professional, setProfessional] = useState('');
  const [scheduledAt, setScheduledAt] = useState(''); const [duration, setDuration] = useState('50');
  const [location, setLocation] = useState(''); const [notes, setNotes] = useState(''); const [reminder, setReminder] = useState(false); const [saving, setSaving] = useState(false);
  async function save() {
    if (!session) return; const iso = parseLocalDateTime(scheduledAt); if (!iso) { Alert.alert('Data inválida', 'Use o formato AAAA-MM-DD HH:mm.'); return; }
    setSaving(true); try {
      const person = professional.trim() ? await saveProfessional({ name: professional, specialty: null, phone: null, email: null, notes: null }, session.user.id) : null;
      const appointment = await saveAppointment({ professionalId: person?.id ?? null, title, scheduledAt: iso, durationMinutes: duration ? Number(duration) : null, location: location.trim() || null, notes: notes.trim() || null, reminderEnabled: reminder }, session.user.id);
      if (reminder) await scheduleAppointmentReminder(session.user.id, appointment.id, appointment.scheduledAt).catch(() => []);
      void sync.syncNow(); router.back();
    } catch { Alert.alert('Não foi possível salvar', 'Revise os dados e tente novamente.'); } finally { setSaving(false); }
  }
  return <Screen><BackHeader eyebrow="NOVA CONSULTA" title="Registrar compromisso de cuidado" /><Surface style={styles.section}>
    <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Consulta com psiquiatra" />
    <TextField label="Profissional" value={professional} onChangeText={setProfessional} placeholder="Opcional" />
    <TextField label="Data e hora" value={scheduledAt} onChangeText={setScheduledAt} placeholder="AAAA-MM-DD HH:mm" />
    <TextField label="Duração em minutos" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
    <TextField label="Local ou link" value={location} onChangeText={setLocation} />
    <TextField label="Notas" value={notes} onChangeText={setNotes} multiline />
    <CheckboxRow checked={reminder} onChange={setReminder} label="Lembrar uma hora antes" description="A notificação usa texto neutro." />
  </Surface><PrimaryButton label="Salvar consulta" loading={saving} onPress={() => void save()} /></Screen>;
}
const styles = StyleSheet.create({ section: { gap: spacing.lg, marginBottom: spacing.md } });
