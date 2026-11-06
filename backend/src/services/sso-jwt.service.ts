/**
 * Verifies the HS256 SSO JWT Ndomi mints and redirects the student's
 * browser with. Mirrors Ndomi's own signFieldLinkSsoToken exactly
 * (same header/payload/signature shape), using plain Node crypto so
 * the two sides never drift on a JWT library's quirks.
 */
import crypto from 'crypto';

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

export interface SsoJwtPayload {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  sub: string;
  email: string;
  name: string;
  phone?: string | null;
  picture?: string | null;
  verified: boolean;
  university_name?: string | null;
  field_of_study?: string | null;
  year_of_study?: string | null;
  faculty_or_department?: string | null;
  selected_companies: Array<{
    company_id: string;
    field_id: string;
    company_name: string;
    title?: string | null;
    location?: string | null;
    category?: string | null;
    category_detail?: string | null;
    company_logo_url?: string | null;
  }>;
}

export class SsoTokenError extends Error {}

/** Verify signature + exp/iss/aud, return the decoded payload. Throws SsoTokenError on any failure. */
export function verifySsoToken(token: string, secret: string): SsoJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new SsoTokenError('Malformed token');
  const [h, p, s] = parts;

  const expectedSig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const providedSig = b64urlDecode(s);
  if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
    throw new SsoTokenError('Invalid signature');
  }

  let payload: SsoJwtPayload;
  try {
    payload = JSON.parse(b64urlDecode(p).toString('utf8'));
  } catch {
    throw new SsoTokenError('Invalid payload encoding');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== 'ndomi.app') throw new SsoTokenError('Unexpected issuer');
  if (payload.aud !== 'fieldlink') throw new SsoTokenError('Unexpected audience');
  if (typeof payload.exp !== 'number' || now > payload.exp) throw new SsoTokenError('Token expired');
  if (!payload.sub || !payload.jti) throw new SsoTokenError('Missing required claims');

  return payload;
}
