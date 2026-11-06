import { supabaseAdmin } from '../config/supabase.js';
import { AppError, ValidationError } from '../utils/errors.js';

const PACKAGE_AMOUNT = 10000;
const PACKAGE_APPLICATIONS = 3;

/**
 * No real payment gateway wired yet (the frontend prototype explicitly
 * marks this step "Demo payment, no charge is processed"); this records
 * a paid package immediately so the rest of the flow (document upload,
 * application submission) has something real to consume against.
 */
export async function createPackagePayment(
  studentId: string,
  params: { provider: string; providerReference?: string },
) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  if (!params.provider.trim()) throw new ValidationError('A payment provider is required');

  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert({
      student_id: studentId,
      amount: PACKAGE_AMOUNT,
      currency: 'TZS',
      provider: params.provider.trim(),
      provider_reference: params.providerReference ?? null,
      paid_at: new Date().toISOString(),
      applications_included: PACKAGE_APPLICATIONS,
      applications_used: 0,
    })
    .select()
    .single();
  if (error || !data) throw new AppError('Failed to record payment', 500, 'INTERNAL_ERROR');
  return data;
}

/** Atomically claims one application slot from a payment package, or throws if exhausted. */
export async function consumePaymentSlot(paymentId: string, studentId: string): Promise<void> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('id, student_id, applications_included, applications_used')
    .eq('id', paymentId)
    .maybeSingle();
  if (error || !payment) throw new ValidationError('Payment not found');
  if (payment.student_id !== studentId) throw new ValidationError('This payment does not belong to this student');
  if (payment.applications_used >= payment.applications_included) {
    throw new ValidationError('All applications included in this payment have already been used');
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('payments')
    .update({ applications_used: payment.applications_used + 1 })
    .eq('id', paymentId)
    .eq('applications_used', payment.applications_used)
    .select('id');
  if (updateErr) throw new AppError('Failed to claim application slot', 500, 'INTERNAL_ERROR');
  if (!updated || updated.length === 0) {
    throw new ValidationError('This payment was just updated elsewhere, please retry');
  }
}
