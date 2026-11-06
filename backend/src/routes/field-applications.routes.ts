import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ndomiWebsiteSupabase } from '../config/supabase.js';
import { handleError, AppError, AuthenticationError } from '../utils/errors.js';

const router = Router();

const viewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

/**
 * Submissions from the public /apply/ lead form, read back from the
 * website's own Supabase project. Gated by a plain shared secret instead
 * of FieldLink's own admin login, since that login currently depends on
 * Ndomi-App's paused Supabase project and this must keep working
 * independently of that outage.
 */
router.get('/', viewLimiter, async (req, res) => {
  try {
    const expected = process.env.FIELD_APPLICATIONS_VIEW_SECRET;
    if (!expected || expected.length < 12) {
      res.status(503).json({ success: false, error: 'Viewer not configured (set FIELD_APPLICATIONS_VIEW_SECRET)', code: 'NOT_CONFIGURED' });
      return;
    }
    const auth = req.header('Authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (token !== expected) throw new AuthenticationError('Incorrect passcode');

    if (!ndomiWebsiteSupabase) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
    const { data, error } = await ndomiWebsiteSupabase
      .from('field_experience_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new AppError('Failed to load applications', 500, 'INTERNAL_ERROR');
    res.json({ success: true, data: data ?? [] });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
