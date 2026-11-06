import { supabaseAdmin } from '../config/supabase.js';
import { verifySsoToken, SsoTokenError, SsoJwtPayload } from './sso-jwt.service.js';
import { issueStudentSessionToken } from './student-session.service.js';
import { AppError, ValidationError } from '../utils/errors.js';

const FIELDLINK_JWT_SECRET = process.env.FIELDLINK_JWT_SECRET || '';

/**
 * The one-time SSO exchange: verify Ndomi's JWT, reject replay, upsert
 * the local students cache row, auto-create "pending_admin" applications
 * for whatever field spaces the student selected on Ndomi's side, and
 * hand back a FieldLink session token for the rest of the visit.
 */
export async function exchangeSsoToken(token: string): Promise<{ sessionToken: string; student: Record<string, unknown> }> {
  if (!FIELDLINK_JWT_SECRET) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');

  let payload: SsoJwtPayload;
  try {
    payload = verifySsoToken(token, FIELDLINK_JWT_SECRET);
  } catch (err) {
    if (err instanceof SsoTokenError) throw new ValidationError(err.message);
    throw err;
  }

  const { error: replayErr } = await supabaseAdmin
    .from('used_sso_tokens')
    .insert({ jti: payload.jti });
  if (replayErr) {
    // Unique violation on jti means this exact token was already exchanged.
    throw new ValidationError('This login link has already been used');
  }

  const { data: student, error: upsertErr } = await supabaseAdmin
    .from('students')
    .upsert(
      {
        ndomi_user_id: payload.sub,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        picture: payload.picture ?? null,
        university_name: payload.university_name ?? null,
        field_of_study: payload.field_of_study ?? null,
        year_of_study: payload.year_of_study ?? null,
        faculty_or_department: payload.faculty_or_department ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ndomi_user_id' },
    )
    .select()
    .single();
  if (upsertErr || !student) throw new AppError('Failed to record student profile', 500, 'INTERNAL_ERROR');

  if (payload.selected_companies?.length) {
    await createPendingApplicationsForSelection(student.id, payload.selected_companies);
  }

  const sessionToken = issueStudentSessionToken(payload.sub);
  return { sessionToken, student };
}

/**
 * The SSO payload names Ndomi-side company/field ids, which don't exist
 * on FieldLink. Ndomi stays the browsable catalog (students still pick
 * on Discover > Field there); FieldLink only needs a row per opportunity
 * to attach required_documents/slots/deadline to, so we upsert one keyed
 * on ndomi_field_id the first time it's ever referenced, denormalizing
 * title/location/category straight from the JWT. A company that hasn't
 * registered on FieldLink yet has no company_profiles row, so that
 * selection is skipped, not an error — the student still has the others.
 */
async function createPendingApplicationsForSelection(
  studentId: string,
  selected: SsoJwtPayload['selected_companies'],
): Promise<void> {
  if (!supabaseAdmin) return;

  const ndomiCompanyIds = [...new Set(selected.map((s) => s.company_id))];
  const { data: companies } = await supabaseAdmin
    .from('company_profiles')
    .select('id, ndomi_company_id')
    .in('ndomi_company_id', ndomiCompanyIds);
  const companyIdByNdomiId = new Map((companies ?? []).map((c) => [c.ndomi_company_id, c.id]));

  for (const sel of selected) {
    const localCompanyId = companyIdByNdomiId.get(sel.company_id);
    if (!localCompanyId) continue;

    const { data: fieldSpace, error: fsErr } = await supabaseAdmin
      .from('field_spaces')
      .upsert(
        {
          ndomi_field_id: sel.field_id,
          company_id: localCompanyId,
          title: sel.title ?? 'Field opportunity',
          location: sel.location ?? null,
          category: sel.category ?? null,
        },
        { onConflict: 'ndomi_field_id', ignoreDuplicates: false },
      )
      .select('id')
      .single();
    if (fsErr || !fieldSpace) continue;

    await supabaseAdmin
      .from('applications')
      .upsert(
        { student_id: studentId, field_space_id: fieldSpace.id, status: 'pending_admin' },
        { onConflict: 'student_id,field_space_id', ignoreDuplicates: true },
      );
  }
}

export async function getStudentByNdomiUserId(ndomiUserId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('ndomi_user_id', ndomiUserId)
    .single();
  if (error || !data) throw new AppError('Student not found', 404, 'NOT_FOUND');
  return data;
}
