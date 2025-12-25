import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { ApiError } from '../errors/ApiError';
import { Role } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  role: Role;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization header missing'));
  }
  const token = header.replace('Bearer ', '').trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }
}
