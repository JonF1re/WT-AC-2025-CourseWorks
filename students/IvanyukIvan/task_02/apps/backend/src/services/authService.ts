import { randomUUID } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Role, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../errors/ApiError';
import { calcExpiryDate, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { hashPassword, verifyPassword } from '../utils/password';
import { env } from '../config/env';

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

export async function register(input: RegisterInput, meta: RequestMeta) {
  const { username, email, password } = input;
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: Role.user
      }
    });

    const session = await issueTokens(user, meta);
    return session;
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'User with this username or email already exists');
    }
    throw err;
  }
}

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return issueTokens(user, meta);
}

export async function refresh(refreshToken: string, meta: RequestMeta) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const hashedJti = hashToken(payload.jti);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashedJti } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    await revokeAllUserTokens(payload.sub);
    throw new ApiError(401, 'Refresh token revoked or expired');
  }

  if (stored.replacedByTokenId) {
    await revokeAllUserTokens(payload.sub);
    throw new ApiError(401, 'Refresh token reuse detected');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    await revokeAllUserTokens(payload.sub);
    throw new ApiError(401, 'User not found');
  }

  const newSession = await rotateSession(stored.id, payload.jti, user, meta);
  return newSession;
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const hashedJti = hashToken(payload.jti);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashedJti, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  } catch (_err) {
    // ignore invalid token on logout
  }
}

async function issueTokens(user: User, meta: RequestMeta) {
  const jti = randomUUID();
  const refreshToken = signRefreshToken(user.id, user.role, jti);
  const accessToken = signAccessToken(user.id, user.role);

  const expiresAt = calcExpiryDate(env.JWT_REFRESH_TTL);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(jti),
      userId: user.id,
      expiresAt,
      createdByIp: meta.ip,
      userAgent: meta.userAgent
    }
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user)
  };
}

async function rotateSession(tokenId: string, jti: string, user: User, meta: RequestMeta) {
  const newJti = randomUUID();
  const newRefreshToken = signRefreshToken(user.id, user.role, newJti);
  const newAccessToken = signAccessToken(user.id, user.role);

  const expiresAt = calcExpiryDate(env.JWT_REFRESH_TTL);

  const newRecord = await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newJti),
      userId: user.id,
      expiresAt,
      createdByIp: meta.ip,
      userAgent: meta.userAgent
    }
  });

  await prisma.refreshToken.updateMany({
    where: { id: tokenId },
    data: { revokedAt: new Date(), replacedByTokenId: newRecord.id }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: sanitizeUser(user)
  };
}

async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

function sanitizeUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}
