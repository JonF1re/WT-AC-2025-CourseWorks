import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateBody } from '../middleware/validate';
import { AppError } from '../lib/errors';
import { getPagination } from '../utils/pagination';

const router = Router();

const baseSchema = z.object({
  roadmapId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().nonnegative()
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { limit, offset } = getPagination(req.query.limit as string, req.query.offset as string);
    const roadmapId = req.query.roadmap_id as string | undefined;
    const isAdmin = req.user?.role === Role.admin;

    const where: any = {};
    if (roadmapId) where.roadmapId = roadmapId;

    const steps = await prisma.step.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { order: 'asc' },
      include: { roadmap: true, resources: true }
    });

    const filtered = steps.filter((s) => isAdmin || s.roadmap.isPublished === true);
    return res.json({ status: 'ok', data: { items: filtered, limit, offset } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const step = await prisma.step.findUnique({
      where: { id: req.params.id },
      include: { roadmap: true, resources: true }
    });
    if (!step) {
      throw new AppError(404, 'not_found', 'Step not found');
    }
    if (step.roadmap.isPublished === false && req.user?.role !== Role.admin) {
      throw new AppError(403, 'forbidden', 'Step not accessible');
    }
    return res.json({ status: 'ok', data: { step } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(Role.admin), validateBody(baseSchema), async (req, res, next) => {
  try {
    const data = req.body as z.infer<typeof baseSchema>;
    const step = await prisma.step.create({ data });
    return res.status(201).json({ status: 'ok', data: { step } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole(Role.admin), validateBody(baseSchema.partial()), async (req, res, next) => {
  try {
    const data = req.body as Partial<z.infer<typeof baseSchema>>;
    const step = await prisma.step.update({ where: { id: req.params.id }, data });
    return res.json({ status: 'ok', data: { step } });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Step not found'));
    }
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    await prisma.step.delete({ where: { id: req.params.id } });
    return res.json({ status: 'ok' });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Step not found'));
    }
    next(err);
  }
});

export default router;