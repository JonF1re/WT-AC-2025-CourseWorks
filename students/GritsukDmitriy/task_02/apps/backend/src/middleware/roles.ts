import { NextFunction, Response } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './auth';
import { AppError } from '../lib/errors';

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'unauthorized', 'Authorization header is missing'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'forbidden', 'Insufficient permissions'));
    }
    return next();
  };
}