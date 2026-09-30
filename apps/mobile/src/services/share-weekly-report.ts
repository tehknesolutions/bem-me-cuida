import { Share } from 'react-native';
import { formatWeeklyReport, type WeeklyShareFacts } from './weekly-report-format';

export { formatWeeklyReport } from './weekly-report-format';
export type { WeeklyShareFacts } from './weekly-report-format';

export async function shareWeeklyReport(facts: WeeklyShareFacts): Promise<void> {
  await Share.share({ title: 'Relatório semanal do BemMeCuida', message: formatWeeklyReport(facts) });
}
