import { NextFunction, Request, Response } from 'express';
import { ApiError, isApiError } from '../errors/ApiError';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isApiError(err)) {
    return res.status(err.statusCode).json({ status: 'error', error: { message: err.message, code: err.code } });
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join('; ');
    return res.status(400).json({ status: 'error', error: { message, code: 'validation_error' } });
  }

  console.error(err);
  return res.status(500).json({ status: 'error', error: { message: 'Internal server error' } });
}
