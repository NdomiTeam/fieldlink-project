/** Fixed document-type enum, per the agreed-with-Ndomi document list. */
export const MANDATORY_DOCUMENT_TYPES = ['introduction_letter', 'national_id', 'cv'] as const;
export const OPTIONAL_DOCUMENT_TYPES = ['academic_transcript', 'passport_photo', 'insurance_proof'] as const;

export const ALL_DOCUMENT_TYPES = [...MANDATORY_DOCUMENT_TYPES, ...OPTIONAL_DOCUMENT_TYPES] as const;

export type DocumentType = (typeof ALL_DOCUMENT_TYPES)[number];

export function isValidDocumentType(value: string): value is DocumentType {
  return (ALL_DOCUMENT_TYPES as readonly string[]).includes(value);
}
