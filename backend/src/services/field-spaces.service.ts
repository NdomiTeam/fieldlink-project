import { supabaseAdmin } from '../config/supabase.js';
import { AppError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { ALL_DOCUMENT_TYPES, MANDATORY_DOCUMENT_TYPES, isValidDocumentType } from '../data/document-types.js';

export async function listFieldSpacesForCompany(companyId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('field_spaces')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError('Failed to load field spaces', 500, 'INTERNAL_ERROR');
  return data ?? [];
}

/**
 * Companies may only set which OPTIONAL documents they require
 * (introduction_letter/national_id/cv stay mandatory for everyone) —
 * matches the user-approved document list exactly.
 */
export async function updateFieldSpaceRequirements(
  companyId: string,
  fieldSpaceId: string,
  params: { requiredDocuments?: string[]; slots?: number; deadline?: string | null; isOpen?: boolean },
) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('field_spaces')
    .select('id, company_id')
    .eq('id', fieldSpaceId)
    .maybeSingle();
  if (fetchErr || !existing) throw new ValidationError('Field space not found');
  if (existing.company_id !== companyId) throw new AuthorizationError('This field space belongs to another company');

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (params.requiredDocuments) {
    const optionalOnly = params.requiredDocuments.filter((d) => !(MANDATORY_DOCUMENT_TYPES as readonly string[]).includes(d));
    const invalid = optionalOnly.filter((d) => !isValidDocumentType(d));
    if (invalid.length) throw new ValidationError(`Unknown document type(s): ${invalid.join(', ')}`);
    update.required_documents = [...new Set([...MANDATORY_DOCUMENT_TYPES, ...optionalOnly])];
  }
  if (typeof params.slots === 'number') {
    if (params.slots < 0) throw new ValidationError('Slots cannot be negative');
    update.slots = params.slots;
  }
  if (params.deadline !== undefined) update.deadline = params.deadline;
  if (typeof params.isOpen === 'boolean') update.is_open = params.isOpen;

  const { data, error } = await supabaseAdmin.from('field_spaces').update(update).eq('id', fieldSpaceId).select().single();
  if (error || !data) throw new AppError('Failed to update field space', 500, 'INTERNAL_ERROR');
  return data;
}

export { ALL_DOCUMENT_TYPES };
