import { supabaseAdmin, createAuthOnlyClient } from '../config/supabase.js';
import { AppError, AuthenticationError, AuthorizationError, ValidationError } from '../utils/errors.js';

/** Creates an admin row that stays unusable (is_approved = false) until an existing admin approves it. */
export async function registerAdmin(email: string, password: string, name: string): Promise<{ id: string }> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password || password.length < 8 || !name.trim()) {
    throw new ValidationError('A name, a valid email, and a password of at least 8 characters are required');
  }

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });
  if (authErr || !authUser?.user) {
    throw new AppError(authErr?.message || 'Failed to create account', 400, 'SIGNUP_FAILED');
  }

  const { error: profileErr } = await supabaseAdmin.from('admin_profiles').insert({
    id: authUser.user.id,
    name: name.trim(),
    email: normalizedEmail,
    is_approved: false,
  });
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new AppError('Failed to finish registration', 500, 'INTERNAL_ERROR');
  }

  return { id: authUser.user.id };
}

export async function loginAdmin(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; isApproved: boolean }> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await createAuthOnlyClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data?.session) throw new AuthenticationError('Incorrect email or password');

  const { data: profile } = await supabaseAdmin
    .from('admin_profiles')
    .select('id, is_approved')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile) throw new AuthenticationError('This account is not an admin account');

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, isApproved: profile.is_approved };
}

export async function approveAdmin(approvingAdminId: string, targetAdminId: string): Promise<void> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data: target } = await supabaseAdmin
    .from('admin_profiles')
    .select('id, is_approved')
    .eq('id', targetAdminId)
    .maybeSingle();
  if (!target) throw new AuthorizationError('Admin account not found');
  if (target.is_approved) return;

  await supabaseAdmin
    .from('admin_profiles')
    .update({ is_approved: true, approved_by: approvingAdminId, approved_at: new Date().toISOString() })
    .eq('id', targetAdminId);
}

export async function listPendingAdmins() {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data } = await supabaseAdmin
    .from('admin_profiles')
    .select('id, name, email, created_at')
    .eq('is_approved', false)
    .order('created_at', { ascending: true });
  return data ?? [];
}
