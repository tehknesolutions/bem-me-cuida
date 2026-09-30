export type WeeklyShareFacts = {
  startLabel: string; endLabel: string; totalRecords: number; medicationRecords: number; practiceRecords: number; checkInDays: number;
  currentTotal: number; previousTotal: number; currentMedication: number; previousMedication: number; currentPractice: number; previousPractice: number;
  currentCheckIns: number; previousCheckIns: number; currentActiveDays: number; previousActiveDays: number;
};

export function formatWeeklyReport(facts: WeeklyShareFacts): string {
  const delta = (current: number, previous: number) => `${current - previous > 0 ? '+' : ''}${current - previous}`;
  return [
    'BEMME CUIDA', 'Relatório semanal factual', `${facts.startLabel} → ${facts.endLabel}`, '', 'RESUMO',
    `Registros: ${facts.totalRecords}`, `Medicações: ${facts.medicationRecords}`, `Práticas: ${facts.practiceRecords}`, `Dias com check-in: ${facts.checkInDays}/7`, '',
    'COMPARAÇÃO COM A SEMANA ANTERIOR',
    `Medicações: ${facts.currentMedication} vs ${facts.previousMedication} (${delta(facts.currentMedication, facts.previousMedication)})`,
    `Práticas: ${facts.currentPractice} vs ${facts.previousPractice} (${delta(facts.currentPractice, facts.previousPractice)})`,
    `Check-ins: ${facts.currentCheckIns} vs ${facts.previousCheckIns} (${delta(facts.currentCheckIns, facts.previousCheckIns)})`,
    `Dias com registro: ${facts.currentActiveDays} vs ${facts.previousActiveDays} (${delta(facts.currentActiveDays, facts.previousActiveDays)})`,
    `Total: ${facts.currentTotal} vs ${facts.previousTotal} (${delta(facts.currentTotal, facts.previousTotal)})`, '',
    'Este relatório apresenta somente registros salvos no aplicativo. As diferenças são numéricas e não representam avaliação clínica.', 'Tehkné Solutions',
  ].join('\n');
}
