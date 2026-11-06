import { supabaseAdmin } from '../config/supabase.js';
import { lookupApprovedCompanyByEmail, NdomiCompanyNotFoundError } from './ndomi-client.service.js';
import { AppError, AuthenticationError, ValidationError } from '../utils/errors.js';

export async function registerCompany(email: string, password: string): Promise<{ id: string; name: string }> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password || password.length < 8) {
    throw new ValidationError('A valid email and a password of at least 8 characters are required');
  }

  let ndomiCompany;
  try {
    ndomiCompany = await lookupApprovedCompanyByEmail(normalizedEmail);
  } catch (err) {
    if (err instanceof NdomiCompanyNotFoundError) {
      throw new ValidationError('This email is not registered to an approved company on Ndomi');
    }
    throw err;
  }

  const { data: existing } = await supabaseAdmin
    .from('company_profiles')
    .select('id')
    .eq('ndomi_company_id', ndomiCompany.company_id)
    .maybeSingle();
  if (existing) throw new ValidationError('This company already has a FieldLink account');

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });
  if (authErr || !authUser?.user) {
    throw new AppError(authErr?.message || 'Failed to create account', 400, 'SIGNUP_FAILED');
  }

  const { error: profileErr } = await supabaseAdmin.from('company_profiles').insert({
    id: authUser.user.id,
    ndomi_company_id: ndomiCompany.company_id,
    name: ndomiCompany.company_name,
    logo_url: ndomiCompany.company_logo_url,
    email: normalizedEmail,
    phone: ndomiCompany.company_phone,
  });
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new AppError('Failed to finish registration', 500, 'INTERNAL_ERROR');
  }

  return { id: authUser.user.id, name: ndomiCompany.company_name };
}

export async function loginCompany(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data?.session) throw new AuthenticationError('Incorrect email or password');

  const { data: profile } = await supabaseAdmin
    .from('company_profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile) throw new AuthenticationError('This account is not a company account');

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}
