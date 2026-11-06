import { supabaseAdmin, ndomiPublicSchema } from '../config/supabase.js';
import { AppError, AuthenticationError } from '../utils/errors.js';

/**
 * A company logs into FieldLink with the EXACT SAME email/password it
 * already uses for its Ndomi account — there is no separate FieldLink
 * signup. This only works because FieldLink shares Ndomi's own Supabase
 * project (forced by a billing hold on creating a new one), so
 * signInWithPassword here authenticates against the very same
 * auth.users row Ndomi itself uses.
 *
 * On a successful login, (re)link/refresh the local company_profiles
 * mirror from Ndomi's own `companies`/`profiles` tables directly (same
 * database, no network round-trip needed) so the rest of FieldLink has
 * something to query without touching Ndomi's schema on every request.
 */
export async function loginCompany(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  if (!supabaseAdmin || !ndomiPublicSchema) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data?.session) throw new AuthenticationError('Incorrect email or password');

  const { data: company, error: companyErr } = await ndomiPublicSchema
    .from('companies')
    .select('id, name, logo_url, email, phone, verification_status')
    .eq('owner_id', data.user.id)
    .maybeSingle();
  if (companyErr || !company) {
    throw new AuthenticationError('This Ndomi account is not linked to a company');
  }
  if (company.verification_status !== 'Approved') {
    throw new AuthenticationError('Your company is not yet approved on Ndomi');
  }

  const { error: upsertErr } = await supabaseAdmin.from('company_profiles').upsert(
    {
      id: data.user.id,
      ndomi_company_id: company.id,
      name: company.name,
      logo_url: company.logo_url,
      email: company.email || data.user.email,
      phone: company.phone,
      is_approved: true,
    },
    { onConflict: 'id' },
  );
  if (upsertErr) throw new AppError('Failed to link company account', 500, 'INTERNAL_ERROR');

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}
