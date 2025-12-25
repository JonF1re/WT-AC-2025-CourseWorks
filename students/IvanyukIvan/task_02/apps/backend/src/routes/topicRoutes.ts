import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ApiError } from '../errors/ApiError';
import { isAdmin } from '../utils/authz';
import { Role } from '@prisma/client';

const router = Router();

const topicSchema = z.object({
  name: z.string().min(1, 'Введите название темы'),
  description: z.string().optional()
});

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const topics = await prisma.topic.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json({ status: 'ok', data: { topics } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const topic = await prisma.topic.findUnique({ where: { id: req.params.id } });
    if (!topic) return next(new ApiError(404, 'Topic not found'));
    return res.json({ status: 'ok', data: { topic } });
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    const parsed = topicSchema.parse(req.body);
    const topic = await prisma.topic.create({ data: parsed });
    return res.status(201).json({ status: 'ok', data: { topic } });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    const parsed = topicSchema.parse(req.body);
    const topic = await prisma.topic.update({ where: { id: req.params.id }, data: parsed });
    return res.json({ status: 'ok', data: { topic } });
  } catch (err) {
    if ((err as any).code === 'P2025') return next(new ApiError(404, 'Topic not found'));
    return next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    await prisma.topic.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    if ((err as any).code === 'P2025') return next(new ApiError(404, 'Topic not found'));
    return next(err);
  }
});

export default router;
