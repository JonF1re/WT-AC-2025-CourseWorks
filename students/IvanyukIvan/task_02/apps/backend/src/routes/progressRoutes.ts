import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ApiError } from '../errors/ApiError';
import { isAdmin } from '../utils/authz';
import { parsePagination } from '../utils/pagination';
import { Role } from '@prisma/client';

const router = Router();

const createSchema = z.object({
  goalId: z.string().uuid('Invalid goalId'),
  timestamp: z.coerce.date().optional(),
  value: z.number().nonnegative('Value must be >= 0'),
  comment: z.string().max(5000).optional()
});

const updateSchema = z
  .object({
    timestamp: z.coerce.date().optional(),
    value: z.number().nonnegative().optional(),
    comment: z.string().max(5000).optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const goal = await prisma.goal.findUnique({ where: { id: parsed.goalId } });
    if (!goal) return next(new ApiError(404, 'Goal not found'));
    const admin = isAdmin(req.user!.role as Role);
    if (!admin && goal.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));

    const entry = await prisma.progressEntry.create({
      data: {
        goalId: parsed.goalId,
        timestamp: parsed.timestamp ?? undefined,
        value: parsed.value,
        comment: parsed.comment
      }
    });
    return res.status(201).json({ status: 'ok', data: { progress: entry } });
  } catch (err) {
    return next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const filters: any = {};
    if (req.query.goalId) filters.goalId = req.query.goalId;
    if (req.query.from || req.query.to) {
      const range: any = {};
      if (req.query.from) {
        const fromDate = new Date(String(req.query.from));
        if (Number.isNaN(fromDate.getTime())) return next(new ApiError(400, 'Invalid from date'));
        range.gte = fromDate;
      }
      if (req.query.to) {
        const toDate = new Date(String(req.query.to));
        if (Number.isNaN(toDate.getTime())) return next(new ApiError(400, 'Invalid to date'));
        range.lte = toDate;
      }
      filters.timestamp = range;
    }

    const admin = isAdmin(req.user!.role as Role);
    if (admin) {
      if (req.query.userId) {
        filters.goal = { userId: String(req.query.userId) };
      }
    } else {
      filters.goal = { userId: req.user!.id };
    }

    const progress = await prisma.progressEntry.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit
    });
    return res.json({ status: 'ok', data: { progress } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const entry = await prisma.progressEntry.findUnique({ where: { id: req.params.id }, include: { goal: true } });
    if (!entry) return next(new ApiError(404, 'Progress entry not found'));
    const admin = isAdmin(req.user!.role as Role);
    if (!admin && entry.goal.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));
    return res.json({ status: 'ok', data: { progress: entry } });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const admin = isAdmin(req.user!.role as Role);
    const entry = await prisma.progressEntry.findUnique({ where: { id: req.params.id }, include: { goal: true } });
    if (!entry) return next(new ApiError(404, 'Progress entry not found'));
    if (!admin && entry.goal.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));

    const parsed = updateSchema.parse(req.body);
    const updated = await prisma.progressEntry.update({ where: { id: req.params.id }, data: parsed });
    return res.json({ status: 'ok', data: { progress: updated } });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const admin = isAdmin(req.user!.role as Role);
    const entry = await prisma.progressEntry.findUnique({ where: { id: req.params.id }, include: { goal: true } });
    if (!entry) return next(new ApiError(404, 'Progress entry not found'));
    if (!admin && entry.goal.userId !== req.user!.id) return next(new ApiError(403, 'Forbidden'));

    await prisma.progressEntry.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
