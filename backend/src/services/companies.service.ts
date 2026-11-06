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

  // .maybeSingle() would error out instead of picking one when an owner_id
  // has more than one company row (this happens for admin-seeded listings
  // sharing one owner) — fetch as a list and choose instead.
  const { data: companies, error: companyErr } = await ndomiPublicSchema
    .from('companies')
    .select('id, name, logo_url, email, phone, verification_status, created_at')
    .eq('owner_id', data.user.id)
    .order('created_at', { ascending: false });
  if (companyErr) {
    console.error('[companies] Failed to look up Ndomi company for owner_id', data.user.id, companyErr);
    throw new AppError('Failed to verify your company account', 500, 'INTERNAL_ERROR');
  }
  if (!companies || companies.length === 0) {
    throw new AuthenticationError('This Ndomi account is not linked to a company');
  }
  const company = companies.find((c) => c.verification_status === 'Approved') ?? companies[0];
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
  if (upsertErr) {
    console.error('[companies] Failed to upsert company_profiles for', data.user.id, upsertErr);
    throw new AppError(`Failed to link company account: ${upsertErr.message} (code ${upsertErr.code})`, 500, 'INTERNAL_ERROR');
  }

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}
