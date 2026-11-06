/**
 * FieldLink's own short-lived-but-longer-than-5-minutes session token,
 * issued once right after the Ndomi SSO JWT is verified so the student's
 * browser doesn't have to keep re-using (or outlive) the 5-minute JWT
 * for the rest of their visit. Plain Node crypto, same HS256 shape as
 * the SSO token, signed with a separate secret FieldLink owns alone.
 */
import crypto from 'crypto';

const SESSION_SECRET = process.env.FIELDLINK_SESSION_SECRET || process.env.FIELDLINK_JWT_SECRET || '';
const SESSION_TTL_SECONDS = 24 * 60 * 60;

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function issueStudentSessionToken(ndomiUserId: string): string {
  if (!SESSION_SECRET) throw new Error('FIELDLINK_SESSION_SECRET not configured');
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: ndomiUserId, iat: now, exp: now + SESSION_TTL_SECONDS };
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

/** Returns the student's ndomi_user_id, or throws on any invalid/expired token. */
export function verifyStudentSessionToken(token: string): string {
  if (!SESSION_SECRET) throw new Error('FIELDLINK_SESSION_SECRET not configured');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed session token');
  const [h, p, s] = parts;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(`${h}.${p}`).digest();
  const providedSig = b64urlDecode(s);
  if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
    throw new Error('Invalid session token signature');
  }

  const payload = JSON.parse(b64urlDecode(p).toString('utf8')) as { sub: string; exp: number };
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) throw new Error('Session expired');
  if (!payload.sub) throw new Error('Missing subject claim');
  return payload.sub;
}
