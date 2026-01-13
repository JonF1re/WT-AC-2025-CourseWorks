import { Router } from 'express';
import { z } from 'zod';
import { ResourceType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateBody } from '../middleware/validate';
import { AppError } from '../lib/errors';
import { getPagination } from '../utils/pagination';

const router = Router();

const baseSchema = z.object({
  stepId: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  type: z.nativeEnum(ResourceType)
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { limit, offset } = getPagination(req.query.limit as string, req.query.offset as string);
    const stepId = req.query.step_id as string | undefined;
    const isAdmin = req.user?.role === Role.admin;

    const where: any = {};
    if (stepId) where.stepId = stepId;

    const resources = await prisma.resource.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { step: { include: { roadmap: true } } }
    });

    const filtered = resources.filter((r) => isAdmin || r.step.roadmap.isPublished === true);
    return res.json({ status: 'ok', data: { items: filtered, limit, offset } });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: { step: { include: { roadmap: true } } }
    });
    if (!resource) {
      throw new AppError(404, 'not_found', 'Resource not found');
    }
    if (resource.step.roadmap.isPublished === false && req.user?.role !== Role.admin) {
      throw new AppError(403, 'forbidden', 'Resource not accessible');
    }
    return res.json({ status: 'ok', data: { resource } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(Role.admin), validateBody(baseSchema), async (req, res, next) => {
  try {
    const data = req.body as z.infer<typeof baseSchema>;
    const resource = await prisma.resource.create({ data });
    return res.status(201).json({ status: 'ok', data: { resource } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole(Role.admin), validateBody(baseSchema.partial()), async (req, res, next) => {
  try {
    const data = req.body as Partial<z.infer<typeof baseSchema>>;
    const resource = await prisma.resource.update({ where: { id: req.params.id }, data });
    return res.json({ status: 'ok', data: { resource } });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Resource not found'));
    }
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    return res.json({ status: 'ok' });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Resource not found'));
    }
    next(err);
  }
});

export default router;