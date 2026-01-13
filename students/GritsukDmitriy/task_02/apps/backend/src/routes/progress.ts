import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../lib/errors';

const router = Router();

const createSchema = z.object({
  stepId: z.string().uuid()
});

const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  roadmap_id: z.string().uuid().optional()
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    const { user_id, roadmap_id } = parsed.data;

    const isAdmin = req.user?.role === Role.admin;
    const userId = isAdmin ? user_id ?? req.user?.id : req.user?.id;

    if (!userId) {
      throw new AppError(401, 'unauthorized', 'Authorization header is missing');
    }
    if (!isAdmin && user_id && user_id !== userId) {
      throw new AppError(403, 'forbidden', 'Cannot view other users progress');
    }

    if (roadmap_id) {
      const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmap_id } });
      if (!roadmap || roadmap.deletedAt) {
        throw new AppError(404, 'not_found', 'Roadmap not found');
      }
      if (!roadmap.isPublished && !isAdmin) {
        throw new AppError(403, 'forbidden', 'Roadmap not accessible');
      }

      const [totalSteps, completed] = await Promise.all([
        prisma.step.count({ where: { roadmapId: roadmap_id } }),
        prisma.progress.findMany({ where: { userId, step: { roadmapId: roadmap_id }, completed: true } })
      ]);

      const completedSteps = completed.map((p) => p.stepId);
      const percentage = totalSteps === 0 ? 0 : Math.round((completedSteps.length / totalSteps) * 100);

      return res.json({
        status: 'ok',
        data: { completedSteps, totalSteps, percentage }
      });
    }

    const items = await prisma.progress.findMany({
      where: { userId },
      include: { step: { include: { roadmap: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const filtered = items.filter((p) => isAdmin || p.step.roadmap.isPublished === true);
    return res.json({ status: 'ok', data: { items: filtered } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validateBody(createSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { stepId } = req.body as z.infer<typeof createSchema>;
    const step = await prisma.step.findUnique({ include: { roadmap: true }, where: { id: stepId } });
    if (!step) {
      throw new AppError(404, 'not_found', 'Step not found');
    }
    if (!step.roadmap.isPublished && req.user?.role !== Role.admin) {
      throw new AppError(403, 'forbidden', 'Cannot complete step in unpublished roadmap');
    }

    const progress = await prisma.progress.upsert({
      where: { userId_stepId: { userId: req.user!.id, stepId } },
      create: {
        userId: req.user!.id,
        stepId,
        completed: true,
        completedAt: new Date()
      },
      update: {
        completed: true,
        completedAt: new Date()
      }
    });

    return res.status(201).json({ status: 'ok', data: { progress } });
  } catch (err) {
    next(err);
  }
});

// DELETE /progress/step/:stepId - удалить прогресс по stepId (удобнее для фронта)
router.delete('/step/:stepId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { stepId } = req.params;
    const userId = req.user!.id;
    
    const progress = await prisma.progress.findUnique({
      where: { userId_stepId: { userId, stepId } }
    });
    
    if (!progress) {
      throw new AppError(404, 'not_found', 'Progress not found');
    }
    
    await prisma.progress.delete({ where: { id: progress.id } });
    return res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const progress = await prisma.progress.findUnique({ where: { id: req.params.id } });
    if (!progress) {
      throw new AppError(404, 'not_found', 'Progress not found');
    }
    const isOwner = progress.userId === req.user?.id;
    const isAdmin = req.user?.role === Role.admin;
    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'forbidden', 'Cannot delete progress of another user');
    }
    await prisma.progress.delete({ where: { id: progress.id } });
    return res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

export default router;