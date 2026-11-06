import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, createUserClient } from '../config/supabase.js';
import { AuthenticationError, AuthorizationError, handleError } from '../utils/errors.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireCompany / requireAdmin */
      actor?: { id: string; email: string };
      accessToken?: string;
      /** Set by requireStudentSession */
      studentNdomiUserId?: string;
    }
  }
}

/** Company portal: Supabase Auth bearer token + an approved company_profiles row. */
export async function requireCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AuthenticationError('Missing bearer token');
    const accessToken = authHeader.substring(7);

    if (!supabaseAdmin) throw new Error('Server misconfiguration');
    const userClient = createUserClient(accessToken);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) throw new AuthenticationError('Invalid or expired session');

    const { data: company, error: companyErr } = await supabaseAdmin
      .from('company_profiles')
      .select('id, email, is_approved')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (companyErr || !company) throw new AuthorizationError('No company account found for this session');
    if (!company.is_approved) throw new AuthorizationError('This company account has been suspended');

    req.actor = { id: company.id, email: company.email };
    req.accessToken = accessToken;
    next();
  } catch (error) {
    const errorResponse = handleError(error);
    res.status(errorResponse.statusCode).json({ success: false, error: errorResponse.message, code: errorResponse.code });
  }
}

/** Admin portal: Supabase Auth bearer token + an approved admin_profiles row. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AuthenticationError('Missing bearer token');
    const accessToken = authHeader.substring(7);

    if (!supabaseAdmin) throw new Error('Server misconfiguration');
    const userClient = createUserClient(accessToken);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) throw new AuthenticationError('Invalid or expired session');

    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, email, is_approved')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (adminErr || !admin) throw new AuthorizationError('No admin account found for this session');
    if (!admin.is_approved) throw new AuthorizationError('This admin account is awaiting approval from an existing admin');

    req.actor = { id: admin.id, email: admin.email };
    req.accessToken = accessToken;
    next();
  } catch (error) {
    const errorResponse = handleError(error);
    res.status(errorResponse.statusCode).json({ success: false, error: errorResponse.message, code: errorResponse.code });
  }
}
