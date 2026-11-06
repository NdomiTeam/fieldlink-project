import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginCompany } from '../services/companies.service.js';
import { registerAdmin, loginAdmin, approveAdmin, listPendingAdmins } from '../services/admins.service.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { handleError } from '../utils/errors.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

/** No separate FieldLink signup: a company logs in with its existing Ndomi email/password. */
router.post('/company/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginCompany(String(email ?? ''), String(password ?? ''));
    res.json({ success: true, data: result });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/admin/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    const result = await registerAdmin(String(email ?? ''), String(password ?? ''), String(name ?? ''));
    res.status(201).json({ success: true, data: result, message: 'Registration received. An existing admin must approve this account before it can be used.' });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginAdmin(String(email ?? ''), String(password ?? ''));
    if (!result.isApproved) {
      res.status(403).json({ success: false, error: 'This admin account is awaiting approval from an existing admin', code: 'PENDING_APPROVAL' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.get('/admin/pending', requireAdmin, async (_req, res) => {
  try {
    const pending = await listPendingAdmins();
    res.json({ success: true, data: pending });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/admin/pending/:id/approve', requireAdmin, async (req, res) => {
  try {
    await approveAdmin(req.actor!.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
