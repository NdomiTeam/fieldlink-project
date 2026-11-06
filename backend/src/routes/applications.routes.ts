import { Router } from 'express';
import { requireCompany, requireAdmin } from '../middleware/auth.middleware.js';
import {
  listApplicationsForCompany,
  listApplicationsForAdmin,
  adminApproveApplication,
  adminRejectApplication,
  companyAcceptApplication,
  companyRejectApplication,
} from '../services/applications.service.js';
import { handleError } from '../utils/errors.js';

const router = Router();

router.get('/company', requireCompany, async (req, res) => {
  try {
    const applications = await listApplicationsForCompany(req.actor!.id);
    res.json({ success: true, data: applications });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/:id/company-accept', requireCompany, async (req, res) => {
  try {
    await companyAcceptApplication(req.actor!.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/:id/company-reject', requireCompany, async (req, res) => {
  try {
    await companyRejectApplication(req.actor!.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const applications = await listApplicationsForAdmin(status);
    res.json({ success: true, data: applications });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/:id/admin-approve', requireAdmin, async (req, res) => {
  try {
    await adminApproveApplication(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/:id/admin-reject', requireAdmin, async (req, res) => {
  try {
    await adminRejectApplication(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
