import { supabaseAdmin } from '../config/supabase.js';
import { AppError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { sendApplicationStatusChanged } from './webhook-out.service.js';
import { consumePaymentSlot } from './payments.service.js';

const CONFIRMATION_WINDOW_HOURS = 72;

async function getStudentNdomiUserId(studentId: string): Promise<string> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data } = await supabaseAdmin.from('students').select('ndomi_user_id').eq('id', studentId).maybeSingle();
  if (!data) throw new AppError('Student not found', 404, 'NOT_FOUND');
  return data.ndomi_user_id;
}

async function notifyNdomi(applicationId: string, status: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data } = await supabaseAdmin
    .from('applications')
    .select('field_space_id, students!inner(ndomi_user_id)')
    .eq('id', applicationId)
    .single();
  if (!data) return;
  const ndomiUserId = (data as unknown as { students: { ndomi_user_id: string } }).students.ndomi_user_id;
  await sendApplicationStatusChanged({ ndomiUserId, fieldSpaceId: data.field_space_id, status });
}

/** Student submits one of their 3 paid applications to a specific field space. */
export async function submitApplication(studentId: string, fieldSpaceId: string, paymentId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');

  const { data: fieldSpace } = await supabaseAdmin
    .from('field_spaces')
    .select('id, is_open, slots, slots_filled')
    .eq('id', fieldSpaceId)
    .maybeSingle();
  if (!fieldSpace) throw new ValidationError('Field space not found');
  if (!fieldSpace.is_open) throw new ValidationError('This field space is no longer accepting applications');

  await consumePaymentSlot(paymentId, studentId);

  const { data: application, error } = await supabaseAdmin
    .from('applications')
    .upsert(
      { student_id: studentId, field_space_id: fieldSpaceId, payment_id: paymentId, status: 'pending_admin' },
      { onConflict: 'student_id,field_space_id' },
    )
    .select()
    .single();
  if (error || !application) throw new AppError('Failed to submit application', 500, 'INTERNAL_ERROR');

  await notifyNdomi(application.id, 'pending_admin');
  return application;
}

export async function listApplicationsForStudent(studentId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, field_spaces(id, title, company_id, company_profiles(name, logo_url))')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError('Failed to load applications', 500, 'INTERNAL_ERROR');
  return data ?? [];
}

export async function listApplicationsForCompany(companyId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, field_spaces!inner(id, title, company_id), students(name, email, phone, university_name)')
    .eq('field_spaces.company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError('Failed to load applications', 500, 'INTERNAL_ERROR');
  return data ?? [];
}

export async function listApplicationsForAdmin(status?: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  let query = supabaseAdmin
    .from('applications')
    .select('*, field_spaces(id, title, company_profiles(name)), students(name, email, university_name)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new AppError('Failed to load applications', 500, 'INTERNAL_ERROR');
  return data ?? [];
}

async function loadApplicationOrThrow(applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, student_id, field_space_id, status, confirmation_deadline, field_spaces!inner(id, company_id, slots, slots_filled)')
    .eq('id', applicationId)
    .single();
  if (error || !data) throw new ValidationError('Application not found');
  return data as unknown as {
    id: string;
    student_id: string;
    field_space_id: string;
    status: string;
    confirmation_deadline: string | null;
    field_spaces: { id: string; company_id: string; slots: number; slots_filled: number };
  };
}

export async function adminApproveApplication(applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const app = await loadApplicationOrThrow(applicationId);
  if (app.status !== 'pending_admin') throw new ValidationError(`Cannot approve an application in status ${app.status}`);

  await supabaseAdmin.from('applications').update({ status: 'approved_to_company', updated_at: new Date().toISOString() }).eq('id', applicationId);
  await notifyNdomi(applicationId, 'approved_to_company');
}

export async function adminRejectApplication(applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const app = await loadApplicationOrThrow(applicationId);
  if (app.status !== 'pending_admin') throw new ValidationError(`Cannot reject an application in status ${app.status}`);

  await supabaseAdmin.from('applications').update({ status: 'rejected_by_admin', updated_at: new Date().toISOString() }).eq('id', applicationId);
  await notifyNdomi(applicationId, 'rejected_by_admin');
}

/**
 * Company accepts an applicant. If this student now has >=2 concurrent
 * accepted-but-unconfirmed offers, ALL of them (this one included) flip
 * to awaiting_student_confirmation with a fresh 72h deadline — matches
 * the prototype's "MULTIPLE OFFERS, confirm within 72 hours" UI exactly.
 */
export async function companyAcceptApplication(companyId: string, applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const app = await loadApplicationOrThrow(applicationId);
  if (app.field_spaces.company_id !== companyId) throw new AuthorizationError('This application is for another company');
  if (app.status !== 'approved_to_company') throw new ValidationError(`Cannot accept an application in status ${app.status}`);

  await supabaseAdmin.from('applications').update({ status: 'accepted_by_company', updated_at: new Date().toISOString() }).eq('id', applicationId);
  await claimFieldSpaceSlot(app.field_space_id);

  const { data: siblings } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('student_id', app.student_id)
    .eq('status', 'accepted_by_company');

  const concurrentlyAccepted = siblings ?? [];
  if (concurrentlyAccepted.length >= 2) {
    const deadline = new Date(Date.now() + CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const ids = concurrentlyAccepted.map((s) => s.id);
    await supabaseAdmin
      .from('applications')
      .update({ status: 'awaiting_student_confirmation', confirmation_deadline: deadline, updated_at: new Date().toISOString() })
      .in('id', ids);
    for (const id of ids) await notifyNdomi(id, 'awaiting_student_confirmation');
  } else {
    await notifyNdomi(applicationId, 'accepted_by_company');
  }
}

export async function companyRejectApplication(companyId: string, applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const app = await loadApplicationOrThrow(applicationId);
  if (app.field_spaces.company_id !== companyId) throw new AuthorizationError('This application is for another company');
  if (!['approved_to_company', 'accepted_by_company'].includes(app.status)) {
    throw new ValidationError(`Cannot reject an application in status ${app.status}`);
  }

  await supabaseAdmin.from('applications').update({ status: 'rejected_by_company', updated_at: new Date().toISOString() }).eq('id', applicationId);
  if (app.status === 'accepted_by_company') await releaseFieldSpaceSlot(app.field_space_id);
  await notifyNdomi(applicationId, 'rejected_by_company');
}

/** Student picks which of their multiple offers to take; siblings expire and release their slots. */
export async function confirmApplication(ndomiUserId: string, applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data: student } = await supabaseAdmin.from('students').select('id').eq('ndomi_user_id', ndomiUserId).maybeSingle();
  if (!student) throw new AppError('Student not found', 404, 'NOT_FOUND');

  const app = await loadApplicationOrThrow(applicationId);
  if (app.student_id !== student.id) throw new AuthorizationError('This application belongs to another student');
  if (app.status !== 'awaiting_student_confirmation') throw new ValidationError(`Cannot confirm an application in status ${app.status}`);

  await supabaseAdmin.from('applications').update({ status: 'confirmed', confirmation_deadline: null, updated_at: new Date().toISOString() }).eq('id', applicationId);
  await notifyNdomi(applicationId, 'confirmed');

  const { data: siblings } = await supabaseAdmin
    .from('applications')
    .select('id, field_space_id')
    .eq('student_id', student.id)
    .eq('status', 'awaiting_student_confirmation')
    .neq('id', applicationId);

  for (const sib of siblings ?? []) {
    await supabaseAdmin.from('applications').update({ status: 'expired', confirmation_deadline: null, updated_at: new Date().toISOString() }).eq('id', sib.id);
    await releaseFieldSpaceSlot(sib.field_space_id);
    await notifyNdomi(sib.id, 'expired');
  }
}

async function claimFieldSpaceSlot(fieldSpaceId: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data } = await supabaseAdmin.from('field_spaces').select('slots_filled').eq('id', fieldSpaceId).maybeSingle();
  if (!data) return;
  await supabaseAdmin.from('field_spaces').update({ slots_filled: data.slots_filled + 1 }).eq('id', fieldSpaceId);
}

async function releaseFieldSpaceSlot(fieldSpaceId: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { data } = await supabaseAdmin.from('field_spaces').select('slots_filled').eq('id', fieldSpaceId).maybeSingle();
  if (!data) return;
  const nextFilled = Math.max(0, data.slots_filled - 1);
  await supabaseAdmin.from('field_spaces').update({ slots_filled: nextFilled }).eq('id', fieldSpaceId);
}

/** Run periodically by the confirmation-expiry cron job. */
export async function expirePastDeadlineApplications(): Promise<number> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data: stale } = await supabaseAdmin
    .from('applications')
    .select('id, field_space_id')
    .eq('status', 'awaiting_student_confirmation')
    .lt('confirmation_deadline', new Date().toISOString());

  for (const app of stale ?? []) {
    await supabaseAdmin.from('applications').update({ status: 'expired', confirmation_deadline: null, updated_at: new Date().toISOString() }).eq('id', app.id);
    await releaseFieldSpaceSlot(app.field_space_id);
    await notifyNdomi(app.id, 'expired');
  }
  return (stale ?? []).length;
}

export { getStudentNdomiUserId };
