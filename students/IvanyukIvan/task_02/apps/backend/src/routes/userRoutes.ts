import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, username: true, email: true, role: true, createdAt: true } });
    if (!user) {
      return res.status(404).json({ status: 'error', error: { message: 'User not found' } });
    }
    return res.json({ status: 'ok', data: { user } });
  } catch (err) {
    return next(err);
  }
});

export default router;
