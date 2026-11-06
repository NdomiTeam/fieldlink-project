import cron from 'node-cron';
import { expirePastDeadlineApplications } from '../services/applications.service.js';

/** Every 15 minutes, auto-expire any awaiting_student_confirmation row past its 72h deadline. No auto-pick. */
export function startConfirmationExpiryJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const count = await expirePastDeadlineApplications();
      if (count > 0) console.log(`[confirmation-expiry] Expired ${count} stale offer(s)`);
    } catch (err) {
      console.error('[confirmation-expiry] Failed:', err);
    }
  });
}
