import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { login, logout, refresh, register } from '../services/authService';
import { ApiError } from '../errors/ApiError';
import { CookieOptions } from 'express';
import { env } from '../config/env';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only latin letters, digits and underscore'),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: env.NODE_ENV === 'production' ? 'lax' : 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  maxAge: undefined
};

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const session = await register(req.body, { ip: req.ip, userAgent: req.get('user-agent') });
    const maxAge = parseTtl(env.JWT_REFRESH_TTL);
    res.cookie('refreshToken', session.refreshToken, { ...refreshCookieOptions, maxAge });
    return res.status(201).json({ status: 'ok', data: { user: session.user, accessToken: session.accessToken } });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const session = await login(req.body, { ip: req.ip, userAgent: req.get('user-agent') });
    const maxAge = parseTtl(env.JWT_REFRESH_TTL);
    res.cookie('refreshToken', session.refreshToken, { ...refreshCookieOptions, maxAge });
    return res.json({ status: 'ok', data: { user: session.user, accessToken: session.accessToken } });
  } catch (err) {
    return next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw new ApiError(401, 'Refresh token missing');
    const session = await refresh(token, { ip: req.ip, userAgent: req.get('user-agent') });
    const maxAge = parseTtl(env.JWT_REFRESH_TTL);
    res.cookie('refreshToken', session.refreshToken, { ...refreshCookieOptions, maxAge });
    return res.json({ status: 'ok', data: { accessToken: session.accessToken } });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    await logout(token);
    res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined });
    return res.json({ status: 'ok' });
  } catch (err) {
    return next(err);
  }
});

function parseTtl(ttl: string): number | undefined {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return undefined;
  }
}

export default router;
