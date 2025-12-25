import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ms from 'ms';
import { env } from '../config/env';
import { Role } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  role: Role;
  jti: string;
  iat: number;
  exp: number;
};

export function signAccessToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL });
}

export function signRefreshToken(userId: string, role: Role, jti: string) {
  return jwt.sign({ sub: userId, role, jti }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function calcExpiryDate(ttl: string): Date {
  return new Date(Date.now() + ms(ttl));
}
