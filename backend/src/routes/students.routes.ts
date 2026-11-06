import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { exchangeSsoToken, getStudentByNdomiUserId } from '../services/students.service.js';
import { listApplicationsForStudent, confirmApplication, submitApplication } from '../services/applications.service.js';
import { createPackagePayment } from '../services/payments.service.js';
import { requireStudentSession } from '../middleware/student-session.middleware.js';
import { handleError } from '../utils/errors.js';

const router = Router();

const ssoLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

/** Hit once, right after Ndomi redirects the browser here with ?t=<jwt>. */
router.post('/sso/exchange', ssoLimiter, async (req, res) => {
  try {
    const { token } = req.body ?? {};
    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'Missing token', code: 'VALIDATION_ERROR' });
      return;
    }
    const result = await exchangeSsoToken(token);
    res.json({ success: true, data: result });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.get('/me', requireStudentSession, async (req, res) => {
  try {
    const student = await getStudentByNdomiUserId(req.studentNdomiUserId!);
    res.json({ success: true, data: student });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.get('/applications', requireStudentSession, async (req, res) => {
  try {
    const student = await getStudentByNdomiUserId(req.studentNdomiUserId!);
    const applications = await listApplicationsForStudent(student.id as string);
    res.json({ success: true, data: applications });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/payments', requireStudentSession, async (req, res) => {
  try {
    const student = await getStudentByNdomiUserId(req.studentNdomiUserId!);
    const { provider, providerReference } = req.body ?? {};
    const payment = await createPackagePayment(student.id as string, { provider: String(provider ?? 'demo'), providerReference });
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/applications', requireStudentSession, async (req, res) => {
  try {
    const student = await getStudentByNdomiUserId(req.studentNdomiUserId!);
    const { fieldSpaceId, paymentId } = req.body ?? {};
    if (!fieldSpaceId || !paymentId) {
      res.status(400).json({ success: false, error: 'fieldSpaceId and paymentId are required', code: 'VALIDATION_ERROR' });
      return;
    }
    const application = await submitApplication(student.id as string, String(fieldSpaceId), String(paymentId));
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.post('/applications/:id/confirm', requireStudentSession, async (req, res) => {
  try {
    await confirmApplication(req.studentNdomiUserId!, req.params.id);
    res.json({ success: true });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
