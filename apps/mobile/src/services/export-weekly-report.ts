import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type WeeklyPdfInput = {
  startLabel: string;
  endLabel: string;
  totalRecords: number;
  medicationRecords: number;
  practiceRecords: number;
  checkInDays: number;
  currentTotal: number;
  previousTotal: number;
  currentMedication: number;
  previousMedication: number;
  currentPractice: number;
  previousPractice: number;
  currentCheckIns: number;
  previousCheckIns: number;
  currentActiveDays: number;
  previousActiveDays: number;
  days: Array<{ label: string; total: number; medication: number; practice: number; checkIn: number }>;
};

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const delta = (current: number, previous: number) => current - previous;

export function buildWeeklyReportHtml(input: WeeklyPdfInput): string {
  const days = input.days.map((day) => `<tr><td>${escapeHtml(day.label)}</td><td>${day.total}</td><td>${day.medication}</td><td>${day.practice}</td><td>${day.checkIn}</td></tr>`).join('');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
  @page{margin:32px 28px}body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#17202a;margin:0}h1{font-size:25px;margin:0 0 6px}h2{font-size:16px;margin:24px 0 10px}.muted{color:#667085}.brand{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase}.summary{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.metric{width:44%;padding:12px;border:1px solid #e4e7ec;border-radius:10px}.value{font-size:22px;font-weight:700}.label{font-size:11px;color:#667085;margin-top:3px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #eaecf0}th{font-size:10px;color:#667085;text-transform:uppercase}.delta{font-weight:700}.note{margin-top:22px;padding:12px;background:#f8f9fb;border-radius:10px;font-size:10px;line-height:1.5}.footer{margin-top:28px;font-size:9px;color:#667085}
  </style></head><body><div class="brand">Tehkné Solutions · BemMeCuida</div><h1>Relatório semanal</h1><div class="muted">${escapeHtml(input.startLabel)} – ${escapeHtml(input.endLabel)}</div>
  <h2>Resumo</h2><div class="summary"><div class="metric"><div class="value">${input.totalRecords}</div><div class="label">registros</div></div><div class="metric"><div class="value">${input.medicationRecords}</div><div class="label">medicações</div></div><div class="metric"><div class="value">${input.practiceRecords}</div><div class="label">práticas</div></div><div class="metric"><div class="value">${input.checkInDays}/7</div><div class="label">dias com check-in</div></div></div>
  <h2>Comparação numérica</h2><table><thead><tr><th>Indicador</th><th>Atual</th><th>Anterior</th><th>Δ</th></tr></thead><tbody><tr><td>Total</td><td>${input.currentTotal}</td><td>${input.previousTotal}</td><td class="delta">${delta(input.currentTotal,input.previousTotal)}</td></tr><tr><td>Medicações</td><td>${input.currentMedication}</td><td>${input.previousMedication}</td><td class="delta">${delta(input.currentMedication,input.previousMedication)}</td></tr><tr><td>Práticas</td><td>${input.currentPractice}</td><td>${input.previousPractice}</td><td class="delta">${delta(input.currentPractice,input.previousPractice)}</td></tr><tr><td>Check-ins</td><td>${input.currentCheckIns}</td><td>${input.previousCheckIns}</td><td class="delta">${delta(input.currentCheckIns,input.previousCheckIns)}</td></tr><tr><td>Dias com registro</td><td>${input.currentActiveDays}</td><td>${input.previousActiveDays}</td><td class="delta">${delta(input.currentActiveDays,input.previousActiveDays)}</td></tr></tbody></table>
  <h2>Dia a dia</h2><table><thead><tr><th>Dia</th><th>Total</th><th>Med.</th><th>Prát.</th><th>Check-in</th></tr></thead><tbody>${days}</tbody></table>
  <div class="note">Este documento descreve somente registros salvos no aplicativo. As diferenças são exclusivamente numéricas e não constituem avaliação clínica, diagnóstico, recomendação ou conclusão sobre eficácia de tratamento.</div><div class="footer">Gerado localmente pelo BemMeCuida · Tehkné Solutions</div></body></html>`;
}

export async function exportWeeklyReport(input: WeeklyPdfInput): Promise<void> {
  const html = buildWeeklyReportHtml(input);
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792, margins: { top: 28, right: 28, bottom: 28, left: 28 } });
  if (!(await Sharing.isAvailableAsync())) throw new Error('FILE_SHARING_UNAVAILABLE');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório semanal' });
}
