import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, handleError } from '../utils/errors.js';
import { verifyStudentSessionToken } from '../services/student-session.service.js';

/**
 * Students never get a Supabase Auth account. After the one-time SSO
 * exchange, the browser holds a FieldLink-issued session token (longer
 * lived than the 5-minute Ndomi JWT) in an Authorization header, which
 * this middleware verifies and resolves to the student's ndomi_user_id.
 */
export async function requireStudentSession(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AuthenticationError('Missing session token');
    const token = authHeader.substring(7);

    const ndomiUserId = verifyStudentSessionToken(token);
    req.studentNdomiUserId = ndomiUserId;
    next();
  } catch (error) {
    const errorResponse = handleError(error);
    res.status(errorResponse.statusCode).json({ success: false, error: errorResponse.message, code: errorResponse.code });
  }
}
