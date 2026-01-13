import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { validateBody } from '../middleware/validate';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateJti, sha256 } from '../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utils/jwt';
import { env, isProduction } from '../config/env';
import { Role } from '@prisma/client';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number')
});

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

function refreshCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    maxAge: maxAgeMs,
    path: '/'
  } as const;
}

async function createRefreshSession(
  userId: string,
  jti: string,
  expiresAt: Date,
  createdByIp?: string,
  userAgent?: string
) {
  const hashedToken = sha256(jti);
  return prisma.refreshToken.create({
    data: {
      userId,
      hashedToken,
      expiresAt,
      createdByIp,
      userAgent
    }
  });
}

async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

async function revokeToken(hashedToken: string, replacedByTokenId?: string) {
  await prisma.refreshToken.updateMany({
    where: { hashedToken, revokedAt: null },
    data: { revokedAt: new Date(), replacedByTokenId }
  });
}

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) {
      throw new AppError(409, 'conflict', 'User with provided username or email already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: Role.user
      }
    });

    const jti = generateJti();
    const refreshExpires = new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000);
    const refreshSession = await createRefreshSession(
      user.id,
      jti,
      refreshExpires,
      req.ip,
      req.headers['user-agent']?.toString()
    );

    const accessToken = signAccessToken({ sub: user.id, role: user.role, type: 'access' });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, jti, type: 'refresh' });

    res.cookie(env.refreshCookieName, refreshToken, refreshCookieOptions(env.jwtRefreshTtlSeconds * 1000));
    return res.status(201).json({
      status: 'ok',
      data: {
        accessToken,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        refreshTokenId: refreshSession.id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', limiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password');
    }

    const jti = generateJti();
    const refreshExpires = new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000);
    const session = await createRefreshSession(
      user.id,
      jti,
      refreshExpires,
      req.ip,
      req.headers['user-agent']?.toString()
    );

    const accessToken = signAccessToken({ sub: user.id, role: user.role, type: 'access' });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role, jti, type: 'refresh' });

    res.cookie(env.refreshCookieName, refreshToken, refreshCookieOptions(env.jwtRefreshTtlSeconds * 1000));
    return res.json({
      status: 'ok',
      data: {
        accessToken,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        refreshTokenId: session.id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[env.refreshCookieName];
    if (!token) {
      throw new AppError(401, 'unauthorized', 'Refresh token missing');
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (_err) {
      res.clearCookie(env.refreshCookieName, refreshCookieOptions(0));
      throw new AppError(401, 'unauthorized', 'Invalid or expired refresh token');
    }

    const hashed = sha256(payload.jti);
    const stored = await prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      await revokeAllUserTokens(payload.sub);
      res.clearCookie(env.refreshCookieName, refreshCookieOptions(0));
      throw new AppError(401, 'unauthorized', 'Refresh token revoked or expired');
    }

    // rotate
    const newJti = generateJti();
    const newRefreshExpires = new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000);
    const newSession = await prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        hashedToken: sha256(newJti),
        expiresAt: newRefreshExpires,
        createdByIp: req.ip,
        userAgent: req.headers['user-agent']?.toString()
      }
    });

    await revokeToken(hashed, newSession.id);

    const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role, jti: newJti, type: 'refresh' });
    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role, type: 'access' });

    res.cookie(env.refreshCookieName, newRefreshToken, refreshCookieOptions(env.jwtRefreshTtlSeconds * 1000));
    return res.json({
      status: 'ok',
      data: { accessToken }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[env.refreshCookieName];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const hashed = sha256(payload.jti);
        await revokeToken(hashed);
      } catch (_err) {
        // ignore invalid token on logout
      }
    }
    res.clearCookie(env.refreshCookieName, refreshCookieOptions(0));
    return res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

export default router;
