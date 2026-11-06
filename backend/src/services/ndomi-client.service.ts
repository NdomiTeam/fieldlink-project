/**
 * Calls Ndomi's bearer-protected lookup, used once at company
 * registration to confirm the registering email owns an Approved
 * company on Ndomi. Mirrors field.routes.ts's existing
 * company-portal/company-details bearer+rate-limit pattern, just from
 * the FieldLink side as the caller instead of the callee.
 */
const NDOMI_BASE_URL = process.env.NDOMI_BASE_URL || 'https://ndomi.app';
const NDOMI_FIELD_PORTAL_BEARER = process.env.NDOMI_FIELD_PORTAL_BEARER;

export interface NdomiCompanyLookupResult {
  company_id: string;
  company_name: string;
  company_logo_url: string | null;
  company_email: string | null;
  company_phone: string | null;
}

export class NdomiCompanyNotFoundError extends Error {}

export async function lookupApprovedCompanyByEmail(email: string): Promise<NdomiCompanyLookupResult> {
  if (!NDOMI_FIELD_PORTAL_BEARER) {
    throw new Error('NDOMI_FIELD_PORTAL_BEARER not configured');
  }

  const res = await fetch(`${NDOMI_BASE_URL}/api/field/company-portal/lookup-by-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NDOMI_FIELD_PORTAL_BEARER}`,
    },
    body: JSON.stringify({ email }),
  });

  if (res.status === 404) {
    throw new NdomiCompanyNotFoundError('No approved Ndomi company is registered with this email');
  }
  if (!res.ok) {
    throw new Error(`Ndomi lookup failed with status ${res.status}`);
  }

  const data = (await res.json()) as { success?: boolean; data?: NdomiCompanyLookupResult };
  if (!data.success || !data.data?.company_id) {
    throw new NdomiCompanyNotFoundError('No approved Ndomi company is registered with this email');
  }
  return data.data;
}
