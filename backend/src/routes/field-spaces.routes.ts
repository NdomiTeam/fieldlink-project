import { Router } from 'express';
import { requireCompany } from '../middleware/auth.middleware.js';
import { listFieldSpacesForCompany, updateFieldSpaceRequirements } from '../services/field-spaces.service.js';
import { handleError } from '../utils/errors.js';

const router = Router();

router.get('/', requireCompany, async (req, res) => {
  try {
    const spaces = await listFieldSpacesForCompany(req.actor!.id);
    res.json({ success: true, data: spaces });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

router.patch('/:id', requireCompany, async (req, res) => {
  try {
    const { requiredDocuments, slots, deadline, isOpen } = req.body ?? {};
    const updated = await updateFieldSpaceRequirements(req.actor!.id, req.params.id, { requiredDocuments, slots, deadline, isOpen });
    res.json({ success: true, data: updated });
  } catch (error) {
    const e = handleError(error);
    res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
  }
});

export default router;
