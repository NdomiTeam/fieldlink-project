import { supabaseAdmin } from '../config/supabase.js';
import { AppError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { MANDATORY_DOCUMENT_TYPES, isValidDocumentType } from '../data/document-types.js';

const BUCKET = 'application-documents';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function uploadApplicationDocument(
  ndomiUserId: string,
  applicationId: string,
  documentType: string,
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  if (!isValidDocumentType(documentType)) throw new ValidationError('Unknown document type');
  if (file.size > MAX_SIZE_BYTES) throw new ValidationError('File exceeds the 10MB limit');
  if (!ALLOWED_MIME.has(file.mimetype)) throw new ValidationError('Only PDF, PNG, or JPEG files are accepted');

  const { data: student } = await supabaseAdmin.from('students').select('id').eq('ndomi_user_id', ndomiUserId).maybeSingle();
  if (!student) throw new AppError('Student not found', 404, 'NOT_FOUND');

  const { data: application } = await supabaseAdmin
    .from('applications')
    .select('id, student_id, field_spaces!inner(required_documents)')
    .eq('id', applicationId)
    .maybeSingle();
  if (!application) throw new ValidationError('Application not found');
  if (application.student_id !== student.id) throw new AuthorizationError('This application belongs to another student');

  const requiredDocs: string[] = (application as unknown as { field_spaces: { required_documents: string[] } }).field_spaces.required_documents ?? [];
  const isMandatory = (MANDATORY_DOCUMENT_TYPES as readonly string[]).includes(documentType);
  if (!isMandatory && !requiredDocs.includes(documentType)) {
    throw new ValidationError('This field space does not require that document');
  }

  const ext = (file.originalname.split('.').pop() || 'pdf').toLowerCase();
  const storagePath = `${applicationId}/${documentType}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: true,
  });
  if (uploadErr) throw new AppError('Failed to upload document', 500, 'INTERNAL_ERROR');

  const { data: docRow, error: docErr } = await supabaseAdmin
    .from('application_documents')
    .upsert({ application_id: applicationId, document_type: documentType, storage_path: storagePath }, { onConflict: 'application_id,document_type' })
    .select()
    .single();
  if (docErr || !docRow) throw new AppError('Failed to record document', 500, 'INTERNAL_ERROR');
  return docRow;
}

export async function listDocumentsForApplication(applicationId: string) {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data, error } = await supabaseAdmin
    .from('application_documents')
    .select('id, document_type, uploaded_at')
    .eq('application_id', applicationId);
  if (error) throw new AppError('Failed to load documents', 500, 'INTERNAL_ERROR');
  return data ?? [];
}

/** Company/admin read access is signed-URL only — never a public bucket. */
export async function getSignedDocumentUrl(applicationId: string, documentType: string): Promise<string> {
  if (!supabaseAdmin) throw new AppError('Server misconfiguration', 500, 'INTERNAL_ERROR');
  const { data: doc } = await supabaseAdmin
    .from('application_documents')
    .select('storage_path')
    .eq('application_id', applicationId)
    .eq('document_type', documentType)
    .maybeSingle();
  if (!doc) throw new ValidationError('Document not found');

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
  if (error || !data?.signedUrl) throw new AppError('Failed to create signed URL', 500, 'INTERNAL_ERROR');
  return data.signedUrl;
}
