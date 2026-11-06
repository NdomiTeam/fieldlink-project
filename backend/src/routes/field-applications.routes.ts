import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ndomiWebsiteSupabase } from '../config/supabase.js';
import { handleError, AppError, AuthenticationError, ValidationError } from '../utils/errors.js';

const router = Router();

const viewLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const REQUIRED_FIELDS = [
  'full_name', 'email', 'phone', 'gender', 'university', 'course',
  'registration_number', 'academic_level', 'year_of_study', 'preferred_location',
  'company_choice_1', 'company_choice_2', 'company_choice_3',
] as const;

/**
 * Public /apply/ form submission (first time or "Update your information").
 * Goes through the backend (service role) instead of a direct client ->
 * Supabase anon-key upsert, because Postgres RLS requires SELECT
 * visibility on the conflicting row for ON CONFLICT DO UPDATE to work at
 * all, and a public SELECT policy would let anyone holding the public
 * anon key (visible right there in the form's own page source) read
 * every student's name, email and phone directly. Service role bypasses
 * RLS entirely, so no such policy is needed.
 */
router.post('/submit', submitLimiter, async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || !String(body[field]).trim()) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }
    const email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Valid email is required');

    if (!ndomiWebsiteSupabase) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
    const payload = {
      full_name: String(body.full_name).trim(),
      email,
      phone: String(body.phone).trim(),
      gender: String(body.gender).trim(),
      university: String(body.university).trim(),
      course: String(body.course).trim(),
      registration_number: String(body.registration_number).trim(),
      academic_level: String(body.academic_level).trim(),
      year_of_study: String(body.year_of_study).trim(),
      preferred_location: String(body.preferred_location).trim(),
      company_choice_1: String(body.company_choice_1).trim(),
      company_choice_2: String(body.company_choice_2).trim(),
      company_choice_3: String(body.company_choice_3).trim(),
      reason: body.reason ? String(body.reason).trim() : null,
    };
    const { error } = await ndomiWebsiteSupabase
      .from('field_experience_applications')
      .upsert(payload, { onConflict: 'email' });
    if (error) {
      console.error('[field-applications] submit upsert failed', error);
      throw new AppError('Failed to save your application', 500, 'INTERNAL_ERROR');
    }
    res.status(201).json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

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
