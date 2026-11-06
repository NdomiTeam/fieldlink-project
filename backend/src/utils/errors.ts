export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Not allowed') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export function handleError(error: unknown): { statusCode: number; message: string; code: string } {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    console.error('[UNHANDLED]', error);
    return { statusCode: 500, message: 'Something went wrong', code: 'INTERNAL_ERROR' };
  }
  console.error('[UNHANDLED]', error);
  return { statusCode: 500, message: 'Something went wrong', code: 'INTERNAL_ERROR' };
}
