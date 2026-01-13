import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ status: 'error', error: { code: 'unauthorized', message: 'No token provided' } });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ status: 'error', error: { code: 'unauthorized', message: 'Invalid token' } });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', error: { code: 'forbidden', message: 'Insufficient permissions' } });
    }
    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireService = requireRole(['service']);
export const requireUserOrAdmin = requireRole(['user', 'admin']);