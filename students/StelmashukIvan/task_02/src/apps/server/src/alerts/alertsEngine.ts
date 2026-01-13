import { PrismaClient, Reading, AlertRule } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

const RULES_CACHE_TTL = 300;

export function generateMessage(template: string, metricName: string, value: number, threshold: number): string {
  return template
    .replace('{metricName}', metricName)
    .replace('{value}', value.toString())
    .replace('{threshold}', threshold.toString());
}

export async function checkRules(reading: Reading, io?: any): Promise<void> {
  const metricId = reading.metric_id;
  const cacheKey = `alert_rules:${metricId}`;

  try {
    let rules: AlertRule[] | null = null;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      rules = JSON.parse(cached) as AlertRule[];
    }

    if (!rules) {
      rules = await prisma.alertRule.findMany({ where: { metric_id: metricId } });
      await redisClient.set(cacheKey, JSON.stringify(rules), { EX: RULES_CACHE_TTL });
    }

    const metric = await prisma.metric.findUnique({
      where: { id: metricId },
      include: { device: true },
    });
    if (!metric) return;

    for (const rule of rules) {
      const value = reading.value;
      const threshold = rule.threshold;
      let conditionMet = false;

      switch (rule.condition) {
        case '>': conditionMet = value > threshold; break;
        case '<': conditionMet = value < threshold; break;
        case '>=': conditionMet = value >= threshold; break;
        case '<=': conditionMet = value <= threshold; break;
        case '==': conditionMet = value === threshold; break;
        case '!=': conditionMet = value !== threshold; break;
        default: continue;
      }

      if (conditionMet) {
        const message = generateMessage(rule.message_template, metric.name, value, threshold);

        const alertData = {
          metric_id: metricId,
          reading_id: reading.id,
          level: rule.level,
          status: 'new' as const,
          threshold,
          message,
        };

        const createdAlert = await prisma.alert.create({ data: alertData });

        if (io && metric.device.owner_id) {
          io.to(`user:${metric.device.owner_id}`).emit('new_alert', createdAlert);
        }
      }
    }
  } catch (error) {
    console.error(`Error in checkRules for reading ${reading.id}:`, error);
  }
}