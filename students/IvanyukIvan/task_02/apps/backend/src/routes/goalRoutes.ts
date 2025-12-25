import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ApiError } from '../errors/ApiError';
import { isAdmin } from '../utils/authz';
import { parsePagination } from '../utils/pagination';
import { Role } from '@prisma/client';

const router = Router();

const createGoalSchema = z.object({
  topicId: z.string().uuid('Invalid topicId'),
  userId: z.string().uuid('Invalid userId'),
  name: z.string().min(1, 'Введите название цели'),
  description: z.string().optional(),
  targetValue: z.number().positive('Целевое значение должно быть > 0'),
  deadline: z.coerce.date().optional()
});

const updateGoalAdminSchema = z
  .object({
    topicId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    targetValue: z.number().positive().optional(),
    deadline: z.coerce.date().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

const updateGoalUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    deadline: z.coerce.date().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const filters: any = {};
    if (req.query.topicId) filters.topicId = req.query.topicId;
    if (req.query.userId) filters.userId = req.query.userId;

    if (!isAdmin(req.user!.role as Role)) {
      filters.userId = req.user!.id; // scope
    }

    const goals = await prisma.goal.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    return res.json({ status: 'ok', data: { goals } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { progressEntries: true } });
    if (!goal) return next(new ApiError(404, 'Goal not found'));
    if (!isAdmin(req.user!.role as Role) && goal.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));
    return res.json({ status: 'ok', data: { goal } });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    const parsed = createGoalSchema.parse(req.body);
    const goal = await prisma.goal.create({ data: parsed });
    return res.status(201).json({ status: 'ok', data: { goal } });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const isAdminUser = isAdmin(req.user!.role as Role);
    const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(new ApiError(404, 'Goal not found'));
    if (!isAdminUser && existing.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));

    const parsed = isAdminUser ? updateGoalAdminSchema.parse(req.body) : updateGoalUserSchema.parse(req.body);
    const updated = await prisma.goal.update({ where: { id: req.params.id }, data: parsed });
    return res.json({ status: 'ok', data: { goal: updated } });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    await prisma.goal.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    if ((err as any).code === 'P2025') return next(new ApiError(404, 'Goal not found'));
    return next(err);
  }
});

export default router;
