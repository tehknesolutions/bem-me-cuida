import type { CarePracticeCategory, MedicationIntakeStatus, CarePracticeCompletionStatus } from '@bemmecuida/domain';

export const careCategoryLabel: Record<CarePracticeCategory, string> = {
  breathing: 'Respiração',
  exercise: 'Exercício',
  sleep: 'Sono',
  therapy: 'Terapia',
  hydration: 'Hidratação',
  mindfulness: 'Atenção plena',
  custom: 'Personalizada',
};

export const careCategoryEmoji: Record<CarePracticeCategory, string> = {
  breathing: '🌬️',
  exercise: '🚶',
  sleep: '🌙',
  therapy: '💬',
  hydration: '💧',
  mindfulness: '🧘',
  custom: '🌿',
};

export const medicationIntakeLabel: Record<MedicationIntakeStatus, string> = {
  taken: 'Tomado',
  skipped: 'Não tomado',
};

export const practiceCompletionLabel: Record<CarePracticeCompletionStatus, string> = {
  completed: 'Concluído',
  skipped: 'Não realizado',
};
