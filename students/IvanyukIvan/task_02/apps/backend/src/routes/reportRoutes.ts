import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { ApiError } from '../errors/ApiError';
import { isAdmin } from '../utils/authz';
import { Role } from '@prisma/client';

const router = Router();

router.get('/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const admin = isAdmin(req.user!.role as Role);
    if (!admin && req.user!.id !== userId) return next(new ApiError(403, 'Forbidden'));

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
    if (!user) return next(new ApiError(404, 'User not found'));

    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { progressEntries: true, topic: { select: { id: true, name: true } } }
    });

    const totalGoals = goals.length;
    let completedGoals = 0;
    const topicsSummaryMap = new Map<string, { topicId: string; topicName: string; goalsCount: number; completedCount: number; progressSum: number }>();
    const progressOverTimeMap = new Map<string, number>();

    for (const goal of goals) {
      const sum = goal.progressEntries.reduce((acc, p) => acc + p.value, 0);
      const completed = sum >= goal.targetValue;
      if (completed) completedGoals += 1;

      const topicKey = goal.topicId;
      if (!topicsSummaryMap.has(topicKey)) {
        topicsSummaryMap.set(topicKey, {
          topicId: goal.topicId,
          topicName: goal.topic?.name ?? 'Unknown',
          goalsCount: 0,
          completedCount: 0,
          progressSum: 0
        });
      }
      const topicStat = topicsSummaryMap.get(topicKey)!;
      topicStat.goalsCount += 1;
      if (completed) topicStat.completedCount += 1;
      topicStat.progressSum += Math.min(100, Math.round((sum / goal.targetValue) * 100));

      for (const p of goal.progressEntries) {
        const dateKey = p.timestamp.toISOString().substring(0, 10);
        progressOverTimeMap.set(dateKey, (progressOverTimeMap.get(dateKey) ?? 0) + p.value);
      }
    }

    const topicsSummary = Array.from(topicsSummaryMap.values()).map((t) => ({
      topicId: t.topicId,
      topicName: t.topicName,
      goalsCount: t.goalsCount,
      completedCount: t.completedCount,
      progressPercentage: t.goalsCount ? Math.round(t.progressSum / t.goalsCount) : 0
    }));

    const progressOverTime = Array.from(progressOverTimeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totalProgress]) => ({ date, totalProgress }));

    const response = {
      userId: user.id,
      username: user.username,
      totalGoals,
      completedGoals,
      inProgressGoals: totalGoals - completedGoals,
      progressPercentage: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0,
      topicsSummary,
      progressOverTime
    };

    return res.json({ status: 'ok', data: response });
  } catch (err) {
    return next(err);
  }
});

router.get('/topic/:topicId', requireAuth, async (req, res, next) => {
  try {
    if (!isAdmin(req.user!.role as Role)) return next(new ApiError(403, 'Forbidden'));
    const { topicId } = req.params;

    const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, name: true } });
    if (!topic) return next(new ApiError(404, 'Topic not found'));

    const goals = await prisma.goal.findMany({
      where: { topicId },
      include: { progressEntries: true, user: { select: { id: true, username: true } } }
    });

    const totalGoals = goals.length;
    let completedGoals = 0;
    const usersSummaryMap = new Map<string, { userId: string; username: string; goalsCount: number; completedCount: number; progressSum: number }>();

    for (const goal of goals) {
      const sum = goal.progressEntries.reduce((acc, p) => acc + p.value, 0);
      const completed = sum >= goal.targetValue;
      if (completed) completedGoals += 1;

      const userKey = goal.userId;
      if (!usersSummaryMap.has(userKey)) {
        usersSummaryMap.set(userKey, {
          userId: goal.userId,
          username: goal.user.username,
          goalsCount: 0,
          completedCount: 0,
          progressSum: 0
        });
      }
      const userStat = usersSummaryMap.get(userKey)!;
      userStat.goalsCount += 1;
      if (completed) userStat.completedCount += 1;
      userStat.progressSum += Math.min(100, Math.round((sum / goal.targetValue) * 100));
    }

    const usersSummary = Array.from(usersSummaryMap.values()).map((u) => ({
      userId: u.userId,
      username: u.username,
      goalsCount: u.goalsCount,
      completedCount: u.completedCount,
      progressPercentage: u.goalsCount ? Math.round(u.progressSum / u.goalsCount) : 0
    }));

    const response = {
      topicId: topic.id,
      topicName: topic.name,
      totalGoals,
      completedGoals,
      progressPercentage: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0,
      usersSummary
    };

    return res.json({ status: 'ok', data: response });
  } catch (err) {
    return next(err);
  }
});

export default router;
