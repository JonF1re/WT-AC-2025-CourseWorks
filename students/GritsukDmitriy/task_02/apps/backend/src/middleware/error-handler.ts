import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'validation_failed',
        message: 'Validation failed',
        fields: err.flatten().fieldErrors
      }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  console.error(err);
  return res.status(500).json({
    status: 'error',
    error: {
      code: 'internal_error',
      message: 'Something went wrong'
    }
  });
}
