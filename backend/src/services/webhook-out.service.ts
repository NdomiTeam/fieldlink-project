/**
 * Sends the application.status_changed event to Ndomi, same shape and
 * HMAC scheme Ndomi's existing webhook receiver already parses
 * (backend/src/services/field.service.ts handleFieldLinkWebhook).
 */
import crypto from 'crypto';

const NDOMI_BASE_URL = process.env.NDOMI_BASE_URL || 'https://ndomi.app';
const NDOMI_WEBHOOK_PATH = process.env.NDOMI_WEBHOOK_PATH || '/api/field/webhook';
const NDOMI_WEBHOOK_SECRET = process.env.NDOMI_WEBHOOK_SECRET;

export interface ApplicationStatusChangedEvent {
  event: 'application.status_changed';
  event_id: string;
  ndomi_user_id: string;
  field_space_id: string;
  status: string;
}

/** Fire-and-forget-with-retry would be ideal; for now a single attempt, logged on failure. */
export async function sendApplicationStatusChanged(params: {
  ndomiUserId: string;
  fieldSpaceId: string;
  status: string;
}): Promise<void> {
  if (!NDOMI_WEBHOOK_SECRET) {
    console.warn('[webhook-out] NDOMI_WEBHOOK_SECRET not set, skipping webhook send');
    return;
  }

  const body: ApplicationStatusChangedEvent = {
    event: 'application.status_changed',
    event_id: crypto.randomUUID(),
    ndomi_user_id: params.ndomiUserId,
    field_space_id: params.fieldSpaceId,
    status: params.status,
  };
  const rawBody = JSON.stringify(body);
  const signature = crypto.createHmac('sha256', NDOMI_WEBHOOK_SECRET).update(rawBody).digest('hex');

  try {
    const res = await fetch(`${NDOMI_BASE_URL}${NDOMI_WEBHOOK_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FieldLink-Signature': `sha256=${signature}`,
      },
      body: rawBody,
    });
    if (!res.ok) {
      console.error(`[webhook-out] Ndomi webhook returned ${res.status} for application status ${params.status}`);
    }
  } catch (err) {
    console.error('[webhook-out] Failed to reach Ndomi webhook:', err);
  }
}
