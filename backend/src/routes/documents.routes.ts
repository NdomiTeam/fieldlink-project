import { Router } from 'express';
import multer from 'multer';
import { requireStudentSession } from '../middleware/student-session.middleware.js';
import { uploadApplicationDocument, listDocumentsForApplication, getSignedDocumentUrl } from '../services/documents.service.js';
import { handleError, AuthenticationError } from '../utils/errors.js';
import { supabaseAdmin, createUserClient } from '../config/supabase.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/applications/:id/documents/:type', requireStudentSession, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded', code: 'VALIDATION_ERROR' });
      return;
    }
    const doc = await uploadApplicationDocument(req.studentNdomiUserId!, req.params.id, req.params.type, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.get('/applications/:id/documents', requireStudentSession, async (req, res) => {
  try {
    const docs = await listDocumentsForApplication(req.params.id);
    res.json({ success: true, data: docs });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

/**
 * Readable by either the owning company or any approved admin — checked
 * directly here (not via requireCompany/requireAdmin) since those two
 * middlewares respond-and-stop on failure, which would block trying the
 * other role for the same bearer token.
 */
router.get('/applications/:id/documents/:type/signed-url', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AuthenticationError('Missing bearer token');
    if (!supabaseAdmin) throw new Error('Server misconfiguration');

    const accessToken = authHeader.substring(7);
    const { data: userData, error: userErr } = await createUserClient(accessToken).auth.getUser();
    if (userErr || !userData?.user) throw new AuthenticationError('Invalid or expired session');

    const [{ data: company }, { data: admin }] = await Promise.all([
      supabaseAdmin.from('company_profiles').select('id').eq('id', userData.user.id).maybeSingle(),
      supabaseAdmin.from('admin_profiles').select('id, is_approved').eq('id', userData.user.id).maybeSingle(),
    ]);
    if (!company && !(admin && admin.is_approved)) throw new AuthenticationError('Not authorized to view this document');

    const url = await getSignedDocumentUrl(req.params.id, req.params.type);
    res.json({ success: true, data: { url } });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
