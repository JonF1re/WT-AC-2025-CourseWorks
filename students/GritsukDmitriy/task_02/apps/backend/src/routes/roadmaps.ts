import { Router } from 'express';
import { z } from 'zod';
import { Difficulty, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validateBody } from '../middleware/validate';
import { getPagination, formatPaginatedResponse } from '../utils/pagination';
import { AppError } from '../lib/errors';

const router = Router();

const baseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  isPublished: z.boolean().optional()
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { limit, offset, page } = getPagination(
      req.query.limit as string,
      req.query.offset as string,
      req.query.page as string
    );
    const isAdmin = req.user?.role === Role.admin;
    const where: any = { deletedAt: null };

    if (!isAdmin) {
      where.isPublished = true;
    } else {
      if (req.query.isPublished !== undefined) {
        where.isPublished = req.query.isPublished === 'true';
      }
    }
    if (req.query.category) where.category = req.query.category;
    if (req.query.difficulty && Object.values(Difficulty).includes(req.query.difficulty as Difficulty)) {
      where.difficulty = req.query.difficulty as Difficulty;
    }

    const [items, total] = await Promise.all([
      prisma.roadmap.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { steps: true }
          }
        }
      }),
      prisma.roadmap.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    const response = {
      data: items.map(r => ({
        ...r,
        published: r.isPublished,
        _count: { steps: r._count.steps }
      })),
      pagination: { page, limit, total, totalPages }
    };

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const isAdmin = req.user?.role === Role.admin;
    const roadmap = await prisma.roadmap.findFirst({
      where: {
        id: req.params.id,
        deletedAt: null,
        ...(isAdmin ? {} : { isPublished: true })
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            resources: { orderBy: { createdAt: 'asc' } }
          }
        }
      }
    });
    if (!roadmap) {
      throw new AppError(404, 'not_found', 'Roadmap not found or unavailable');
    }
    return res.json({ status: 'ok', data: { roadmap } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(Role.admin), validateBody(baseSchema), async (req, res, next) => {
  try {
    const data = req.body as z.infer<typeof baseSchema>;
    const roadmap = await prisma.roadmap.create({ data });
    return res.status(201).json({ status: 'ok', data: { roadmap } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole(Role.admin), validateBody(baseSchema.partial()), async (req, res, next) => {
  try {
    const data = req.body as Partial<z.infer<typeof baseSchema>>;
    const roadmap = await prisma.roadmap.update({ where: { id: req.params.id }, data });
    return res.json({ status: 'ok', data: { roadmap } });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Roadmap not found'));
    }
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole(Role.admin), async (req, res, next) => {
  try {
    await prisma.roadmap.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    return res.json({ status: 'ok' });
  } catch (err) {
    if ((err as any)?.code === 'P2025') {
      return next(new AppError(404, 'not_found', 'Roadmap not found'));
    }
    next(err);
  }
});

export default router;