import { medicationSchema } from '@bemmecuida/domain';

import { getDatabase } from '@/data/database';
import { enqueueSyncRecord } from '@/data/sync-queue-repository';
import { nextStockQuantity } from '@/services/stock-policy';

export type UndoableRecentAction =
  | { kind: 'medication'; recordId: string; medicationId: string; userId: string; unitsPerIntake: number | null }
  | { kind: 'practice'; recordId: string; userId: string };

export async function undoRecentAction(action: UndoableRecentAction): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (action.kind === 'medication') {
      const intake = await db.getFirstAsync<{ synced_at: string | null; status: string }>(
        'SELECT synced_at, status FROM medication_intakes WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;',
        action.recordId,
        action.userId,
      );
      if (!intake) throw new Error('recent_action_not_found');
      if (intake.synced_at) throw new Error('recent_action_already_synced');

      await db.runAsync(
        `DELETE FROM sync_queue
         WHERE user_id = ? AND entity_type = 'medication_intake' AND entity_id = ? AND operation = 'upsert';`,
        action.userId,
        action.recordId,
      );
      await db.runAsync('DELETE FROM medication_intakes WHERE id = ? AND user_id = ?;', action.recordId, action.userId);

      if (intake.status === 'taken' && action.unitsPerIntake && action.unitsPerIntake > 0) {
        const row = await db.getFirstAsync<Record<string, unknown>>(
          'SELECT * FROM medications WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;',
          action.medicationId,
          action.userId,
        );
        if (row && Boolean(row.stock_tracking_enabled) && row.stock_quantity !== null) {
          const medication = medicationSchema.parse({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            dosageText: row.dosage_text,
            instructions: row.instructions,
            prescriber: row.prescriber,
            startDate: row.start_date,
            endDate: row.end_date,
            active: Boolean(row.active),
            stockTrackingEnabled: true,
            stockQuantity: nextStockQuantity(Number(row.stock_quantity), action.unitsPerIntake),
            unitsPerIntake: row.units_per_intake === null ? null : Number(row.units_per_intake),
            refillThreshold: row.refill_threshold === null ? null : Number(row.refill_threshold),
            refillReminderEnabled: Boolean(row.refill_reminder_enabled),
            refillReminderLastSentAt: row.refill_reminder_last_sent_at ?? null,
            createdAt: row.created_at,
            updatedAt: now,
          });
          await db.runAsync(
            'UPDATE medications SET stock_quantity = ?, updated_at = ?, synced_at = NULL WHERE id = ? AND user_id = ?;',
            medication.stockQuantity,
            now,
            action.medicationId,
            action.userId,
          );
          await enqueueSyncRecord(action.userId, 'medication', action.medicationId, medication, db);
        }
      }
      return;
    }

    const completion = await db.getFirstAsync<{ synced_at: string | null }>(
      'SELECT synced_at FROM care_practice_completions WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;',
      action.recordId,
      action.userId,
    );
    if (!completion) throw new Error('recent_action_not_found');
    if (completion.synced_at) throw new Error('recent_action_already_synced');

    await db.runAsync(
      `DELETE FROM sync_queue
       WHERE user_id = ? AND entity_type = 'care_practice_completion' AND entity_id = ? AND operation = 'upsert';`,
      action.userId,
      action.recordId,
    );
    await db.runAsync('DELETE FROM care_practice_completions WHERE id = ? AND user_id = ?;', action.recordId, action.userId);
  });
}
