import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { AppError } from '../lib/errors';
import { validateBody } from '../middleware/validate';
import { hashPassword } from '../utils/password';
import { getPagination } from '../utils/pagination';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).optional().default(Role.user)
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(Role).optional()
});

router.get('/', requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const { limit, offset } = getPagination(req.query.limit as string, req.query.offset as string);
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true }
      }),
      prisma.user.count()
    ]);
    return res.json({ status: 'ok', data: { items, total, limit, offset } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!req.user) throw new AppError(401, 'unauthorized', 'Authorization header is missing');
    if (req.user.role !== Role.admin && req.user.id !== id) {
      throw new AppError(403, 'forbidden', 'Cannot access other user');
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    if (!user) {
      throw new AppError(404, 'not_found', 'User not found');
    }
    return res.json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(Role.admin), validateBody(createUserSchema), async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body as z.infer<typeof createUserSchema>;
    const exists = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (exists) {
      throw new AppError(409, 'conflict', 'User with provided username or email already exists');
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, role },
      select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    return res.status(201).json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, validateBody(updateUserSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!req.user) throw new AppError(401, 'unauthorized', 'Authorization header is missing');

    const body = req.body as z.infer<typeof updateUserSchema>;
    const isSelf = req.user.id === id;
    const isAdmin = req.user.role === Role.admin;

    if (!isAdmin && !isSelf) {
      throw new AppError(403, 'forbidden', 'Cannot modify other user');
    }
    if (!isAdmin && body.role && body.role !== req.user.role) {
      throw new AppError(403, 'forbidden', 'Cannot change role');
    }

    const data: Record<string, unknown> = {};
    if (body.username) data.username = body.username;
    if (body.email) data.email = body.email;
    if (body.role && isAdmin) data.role = body.role;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    return res.json({ status: 'ok', data: { user } });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'User not found'));
    }
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    return res.json({ status: 'ok' });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'User not found'));
    }
    next(err);
  }
});

router.get('/me/profile', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    if (!user) {
      throw new AppError(404, 'not_found', 'User not found');
    }
    return res.json({ status: 'ok', data: { user } });
  } catch (err) {
    next(err);
  }
});

export default router;
