import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient, Reading } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createClient } from 'redis';
import { checkRules } from './alerts/alertsEngine';
import { authenticate, requireAdmin, requireRole, AuthRequest } from './auth/auth';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { metricsMiddleware, getMetrics, websocketConnectionsTotal, activeAlerts } from './metrics';

const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost'];

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8')
);
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

const liveIo = io.of('/ws/live');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);


app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(metricsMiddleware);

app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use((req, res, next) => {
  const logEntry = JSON.stringify({
    level: 'info',
    message: 'Request received',
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  console.log(logEntry);
  redisClient.lPush('logs', logEntry).catch(console.error);
  redisClient.lTrim('logs', 0, 9999).catch(console.error);
  next();
});

const logger = {
  info: (message: string, extra?: any) => {
    const logEntry = JSON.stringify({
      level: 'info',
      message,
      ...extra,
      timestamp: new Date().toISOString(),
    });
    console.log(logEntry);
    redisClient.lPush('logs', logEntry).catch(console.error);
    redisClient.lTrim('logs', 0, 9999).catch(console.error);
  },
  error: (message: string, extra?: any) => {
    const logEntry = JSON.stringify({
      level: 'error',
      message,
      ...extra,
      timestamp: new Date().toISOString(),
    });
    console.error(logEntry);
    redisClient.lPush('logs', logEntry).catch(console.error);
    redisClient.lTrim('logs', 0, 9999).catch(console.error);
  },
};

const UserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['admin', 'user', 'service']).optional().default('user'),
});
const DeviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  owner_id: z.string().uuid(),
  type: z.string().optional(),
});
const MetricSchema = z.object({
  device_id: z.string().uuid(),
  name: z.string().min(1),
  unit: z.string().min(1),
});
const ReadingSchema = z.object({
  metric_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  value: z.number(),
});
const AlertSchema = z.object({
  metric_id: z.string().uuid(),
  reading_id: z.string().uuid().optional(),
  level: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1),
  threshold: z.number().optional(),
  status: z.enum(['new', 'acknowledged', 'closed']).optional().default('new'),
});
const AlertRuleSchema = z.object({
  metric_id: z.string().uuid(),
  condition: z.string(),
  threshold: z.number(),
  level: z.enum(['info', 'warning', 'critical']),
  message_template: z.string().min(1),
});
const TicketSchema = z.object({
  type: z.enum(['add', 'edit', 'delete']),
  object: z.enum(['user', 'device', 'metric']).optional(),
  comment: z.string().optional(),
  device_id: z.string().uuid().optional(),
});
const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

app.post('/auth/register', async (req, res) => {
  logger.info('Register request', { body: req.body, contentType: req.headers['content-type'] });
  try {
    const data = UserSchema.parse(req.body);
    const user = await prisma.user.create({
      data: { username: data.username, password_hash: data.password, role: data.role },
    });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ status: 'ok', data: { id: user.id, username: user.username, role: user.role, token } });
  } catch (error: any) {
    logger.error('Register validation error', { error: error.message, details: error.issues });
    res.status(400).json({ status: 'error', error: { code: 'validation_failed', message: 'Invalid data' } });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password_hash !== password) throw new Error();
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ status: 'ok', data: { token, user: { id: user.id, username: user.username, role: user.role } } });
  } catch {
    res.status(401).json({ status: 'error', error: { code: 'invalid_credentials', message: 'Invalid credentials' } });
  }
});

app.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const role = req.query.role as string;
  const username = req.query.username as string;
  const where: any = {};
  if (role) where.role = role;
  if (username) where.username = { contains: username, mode: 'insensitive' };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit }),
    prisma.user.count({ where }),
  ]);
  res.json({ status: 'ok', data: users, total, page, limit });
});

app.post('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = UserSchema.parse(req.body);
    const user = await prisma.user.create({ data: { ...data, password_hash: data.password } });
    res.status(201).json({ status: 'ok', data: user });
  } catch (error) {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed', message: 'Invalid data' } });
  }
});

app.get('/users/:id', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ status: 'error', error: { code: 'not_found', message: 'User not found' } });
  res.json({ status: 'ok', data: user });
});

app.put('/users/:id', authenticate, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) return res.status(403).json({ status: 'error', error: { code: 'forbidden' } });
  try {
    const data = UserSchema.partial().parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ status: 'ok', data: user });
  } catch {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed' } });
  }
});

app.delete('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
});

app.get('/devices', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const name = req.query.name as string;
  const location = req.query.location as string;
  const where: any = req.user!.role === 'admin' ? {} : { owner_id: req.user!.id };
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (location) where.location = { contains: location, mode: 'insensitive' };
  const [devices, total] = await Promise.all([
    prisma.device.findMany({ where, skip, take: limit }),
    prisma.device.count({ where }),
  ]);
  res.json({ status: 'ok', data: devices, total, page, limit });
});

// Создание юзеров (роль всегда 'user')
app.post('/users/create-user', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw new Error('Missing fields');

    const user = await prisma.user.create({
      data: { username, password_hash: password, role: 'user' },
    });

    res.status(201).json({ status: 'ok', data: user });
  } catch (error: any) {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed', message: error.message } });
  }
});


app.get('/alerts', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const level = req.query.level as string;
  const status = req.query.status as string;
  const metric_id = req.query.metric_id as string;

  const where: any = req.user!.role === 'admin' ? {} : { metric: { device: { owner_id: req.user!.id } } };
  if (level) where.level = level;
  if (status) where.status = status;
  if (metric_id) where.metric_id = metric_id;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({ where, skip, take: limit }),
    prisma.alert.count({ where }),
  ]);

  res.json({ status: 'ok', data: alerts, total, page, limit });
});


app.post('/devices', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = DeviceSchema.parse(req.body);
    if (req.user!.role !== 'admin' && data.owner_id !== req.user!.id) throw new Error();
    const device = await prisma.device.create({ data });
    res.status(201).json({ status: 'ok', data: device });
  } catch {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed' } });
  }
});

app.get('/devices/:id', authenticate, async (req: AuthRequest, res) => {
  const device = await prisma.device.findUnique({ where: { id: req.params.id }, include: { metrics: true } });
  if (!device || (req.user!.role !== 'admin' && device.owner_id !== req.user!.id)) return res.status(404).json({ status: 'error' });
  res.json({ status: 'ok', data: device });
});

app.put('/devices/:id', authenticate, async (req: AuthRequest, res) => {
  const device = await prisma.device.findUnique({ where: { id: req.params.id } });
  if (!device || (req.user!.role !== 'admin' && device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  try {
    const data = DeviceSchema.partial().parse(req.body);
    const updated = await prisma.device.update({ where: { id: req.params.id }, data });
    res.json({ status: 'ok', data: updated });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.delete('/devices/:id', authenticate, async (req: AuthRequest, res) => {
  const device = await prisma.device.findUnique({ where: { id: req.params.id } });
  if (!device || (req.user!.role !== 'admin' && device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  await prisma.device.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
});

app.get('/metrics', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const name = req.query.name as string;
  const device_id = req.query.device_id as string;

  const where: any = {};
  if (name) where.name = { contains: name, mode: 'insensitive' };
  if (device_id) where.device_id = device_id;

  // Добавляем include: device
  const [metrics, total] = await Promise.all([
    prisma.metric.findMany({
      where,
      skip,
      take: limit,
      include: { device: true }, // <-- вот это важно
    }),
    prisma.metric.count({ where }),
  ]);

  res.json({ status: 'ok', data: metrics, total, page, limit });
});


app.post('/metrics', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = MetricSchema.parse(req.body);
    const device = await prisma.device.findUnique({ where: { id: data.device_id } });
    if (!device || (req.user!.role !== 'admin' && device.owner_id !== req.user!.id)) throw new Error();
    const metric = await prisma.metric.create({ data });
    res.status(201).json({ status: 'ok', data: metric });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.get('/metrics/:id', authenticate, async (req: AuthRequest, res) => {
  const metric = await prisma.metric.findUnique({ where: { id: req.params.id }, include: { device: true } });
  if (!metric || (req.user!.role !== 'admin' && metric.device.owner_id !== req.user!.id)) return res.status(404).json({ status: 'error' });
  res.json({ status: 'ok', data: metric });
});

app.put('/metrics/:id', authenticate, async (req: AuthRequest, res) => {
  const metric = await prisma.metric.findUnique({ where: { id: req.params.id }, include: { device: true } });
  if (!metric || (req.user!.role !== 'admin' && metric.device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  try {
    const data = MetricSchema.partial().parse(req.body);
    const updated = await prisma.metric.update({ where: { id: req.params.id }, data });
    res.json({ status: 'ok', data: updated });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.delete('/metrics/:id', authenticate, async (req: AuthRequest, res) => {
  const metric = await prisma.metric.findUnique({ where: { id: req.params.id }, include: { device: true } });
  if (!metric || (req.user!.role !== 'admin' && metric.device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  await prisma.metric.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
});

app.post('/readings', authenticate, async (req: AuthRequest, res) => {
  try {
    const readings = z.array(ReadingSchema).parse(req.body);
    const metricIds = [...new Set(readings.map(r => r.metric_id))];
    const metrics = await prisma.metric.findMany({
      where: { id: { in: metricIds } },
      include: { device: true },
    });
    const allowedMetricIds = new Set(metrics.filter(m => req.user!.role === 'admin' || m.device.owner_id === req.user!.id).map(m => m.id));
    const validReadings = readings.filter(r => allowedMetricIds.has(r.metric_id)).map(r => ({
      ...r,
      timestamp: new Date(r.timestamp),
    }));
    let created: Reading[] = [];
    if (validReadings.length > 0) {
      created = await prisma.$transaction(
        validReadings.map(data => prisma.reading.create({ data }))
      );
    }
    for (const r of created) { await checkRules(r, liveIo); }
    res.status(202).json({
      status: 'ok',
      data: { accepted: validReadings.length, rejected: readings.length - validReadings.length },
    });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.get('/metrics/:id/readings', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const start_time = req.query.start_time ? new Date(req.query.start_time as string) : undefined;
  const end_time = req.query.end_time ? new Date(req.query.end_time as string) : undefined;
  const min_value = req.query.min_value ? parseFloat(req.query.min_value as string) : undefined;
  const max_value = req.query.max_value ? parseFloat(req.query.max_value as string) : undefined;
  const cacheKey = `readings:${req.params.id}:${req.user!.id}:${page}:${limit}:${start_time?.toISOString() || ''}:${end_time?.toISOString() || ''}:${min_value || ''}:${max_value || ''}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}
  const metric = await prisma.metric.findUnique({ where: { id: req.params.id }, include: { device: true } });
  if (!metric || (req.user!.role !== 'admin' && metric.device.owner_id !== req.user!.id)) return res.status(404).json({ status: 'error' });
  const where: any = { metric_id: req.params.id };
  if (start_time || end_time) {
    where.timestamp = {};
    if (start_time) where.timestamp.gte = start_time;
    if (end_time) where.timestamp.lte = end_time;
  }
  if (min_value || max_value) {
    where.value = {};
    if (min_value) where.value.gte = min_value;
    if (max_value) where.value.lte = max_value;
  }
  const [readings, total] = await Promise.all([
    prisma.reading.findMany({ where, skip, take: limit, orderBy: { timestamp: 'desc' } }),
    prisma.reading.count({ where }),
  ]);
  const response = { status: 'ok', data: readings, total, page, limit };
  try {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
  } catch {}
  res.json(response);
});

app.post('/alerts/:id/close', authenticate, async (req: AuthRequest, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id }, include: { metric: { include: { device: true } } } });
  if (!alert || (req.user!.role !== 'admin' && alert.metric.device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  await prisma.alert.update({ where: { id: req.params.id }, data: { status: 'closed' } });
  res.json({ status: 'ok' });
});

app.get('/alerts', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const level = req.query.level as string;
  const status = req.query.status as string;
  const cacheKey = `alerts:${req.user!.id}:${page}:${limit}:${level || ''}:${status || ''}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}
  const where: any = req.user!.role === 'admin' ? {} : { metric: { device: { owner_id: req.user!.id } } };
  if (level) where.level = level;
  if (status) where.status = status;
  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({ where, skip, take: limit }),
    prisma.alert.count({ where }),
  ]);
  const response = { status: 'ok', data: alerts, total, page, limit };
  try {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
  } catch {}
  res.json(response);
});

app.post('/alerts', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = AlertSchema.parse(req.body);
    const metric = await prisma.metric.findUnique({ where: { id: data.metric_id }, include: { device: true } });
    if (!metric || (req.user!.role !== 'admin' && metric.device.owner_id !== req.user!.id)) throw new Error();
    const alert = await prisma.alert.create({ data });
    res.status(201).json({ status: 'ok', data: alert });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.get('/alerts', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const level = req.query.level as string;
  const status = req.query.status as string;
  const metric_id = req.query.metric_id as string;
  const device_id = req.query.device_id as string;

  const where: any = req.user!.role === 'admin' ? {} : { metric: { device: { owner_id: req.user!.id } } };
  if (level) where.level = level;
  if (status) where.status = status;
  if (metric_id) where.metric_id = metric_id;
  if (device_id) where.metric = { ...where.metric, device_id };

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({ 
      where, 
      skip, 
      take: limit,
      include: {
        reading: true,
        metric: {
          include: {
            device: true
          }
        }
      }
    }),
    prisma.alert.count({ where }),
  ]);

  res.json({ status: 'ok', data: alerts, total, page, limit });
});

app.post('/alerts/:id/ack', authenticate, async (req: AuthRequest, res) => {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id }, include: { metric: { include: { device: true } } } });
  if (!alert || (req.user!.role !== 'admin' && alert.metric.device.owner_id !== req.user!.id)) return res.status(403).json({ status: 'error' });
  await prisma.alert.update({ where: { id: req.params.id }, data: { status: 'acknowledged' } });
  res.json({ status: 'ok' });
});

app.get('/alerts/rules', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const level = req.query.level as string;
  const metric_id = req.query.metric_id as string;
  const cacheKey = `alert_rules:${req.user!.id}:${page}:${limit}:${level || ''}:${metric_id || ''}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}
  const where: any = req.user!.role === 'admin' ? {} : { metric: { device: { owner_id: req.user!.id } } };
  if (level) where.level = level;
  if (metric_id) where.metric_id = metric_id;
  const [rules, total] = await Promise.all([
    prisma.alertRule.findMany({ where, skip, take: limit }),
    prisma.alertRule.count({ where }),
  ]);
  const response = { status: 'ok', data: rules, total, page, limit };
  try {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
  } catch {}
  res.json(response);
});

app.post('/alerts/rules', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = AlertRuleSchema.parse(req.body);
    const metric = await prisma.metric.findUnique({ where: { id: data.metric_id } });
    if (!metric) return res.status(404).json({ status: 'error', error: { code: 'not_found' } });
    const rule = await prisma.alertRule.create({ data });
    res.status(201).json({ status: 'ok', data: rule });
  } catch {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed' } });
  }
});

app.get('/alerts/rules/:id', authenticate, async (req: AuthRequest, res) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: req.params.id }, include: { metric: { include: { device: true } } } });
  if (!rule || (req.user!.role !== 'admin' && rule.metric.device.owner_id !== req.user!.id)) return res.status(404).json({ status: 'error' });
  res.json({ status: 'ok', data: rule });
});

app.put('/alerts/rules/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: req.params.id } });
  if (!rule) return res.status(404).json({ status: 'error' });
  try {
    const data = AlertRuleSchema.partial().parse(req.body);
    const updated = await prisma.alertRule.update({ where: { id: req.params.id }, data });
    res.json({ status: 'ok', data: updated });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.delete('/alerts/rules/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const rule = await prisma.alertRule.findUnique({ where: { id: req.params.id } });
  if (!rule) return res.status(404).json({ status: 'error' });
  await prisma.alertRule.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
});

app.get('/metrics', getMetrics);

io.on('connection', (socket: Socket) => {
    websocketConnectionsTotal.inc();
    logger.info('WebSocket connected', { socketId: socket.id });
    socket.on('disconnect', () => {
        websocketConnectionsTotal.dec();
        logger.info('WebSocket disconnected', { socketId: socket.id });
    });
});

app.get('/tickets', authenticate, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;
  const type = req.query.type as string;
  const cacheKey = `tickets:${req.user!.id}:${page}:${limit}:${status || ''}:${type || ''}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}
  const where: any = req.user!.role === 'admin' ? {} : { requester_id: req.user!.id };
  if (status) where.status = status;
  if (type) where.type = type;
  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({ where, skip, take: limit }),
    prisma.ticket.count({ where }),
  ]);
  const response = { status: 'ok', data: tickets, total, page, limit };
  try {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
  } catch {}
  res.json(response);
});

app.post('/tickets', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = TicketSchema.parse(req.body);
    const ticket = await prisma.ticket.create({
      data: { ...data, requester_id: req.user!.id, status: 'pending' },
    });
    res.status(201).json({ status: 'ok', data: ticket });
  } catch {
    res.status(400).json({ status: 'error', error: { code: 'validation_failed' } });
  }
});

app.get('/tickets/:id', authenticate, async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket || (req.user!.role !== 'admin' && ticket.requester_id !== req.user!.id)) return res.status(404).json({ status: 'error' });
  res.json({ status: 'ok', data: ticket });
});

app.put('/tickets/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ status: 'error' });
  try {
    const data = z.object({ status: z.string() }).parse(req.body);
    const updated = await prisma.ticket.update({ where: { id: req.params.id }, data });
    res.json({ status: 'ok', data: updated });
  } catch {
    res.status(400).json({ status: 'error' });
  }
});

app.delete('/tickets/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ status: 'error' });
  await prisma.ticket.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
});

app.get('/dashboards/home/:homeId/metrics-summary', authenticate, async (req: AuthRequest, res) => {
  const homeId = req.params.homeId;
  if (req.user!.role !== 'admin' && req.user!.id !== homeId) return res.status(403).json({ status: 'error', error: { code: 'forbidden' } });
  const cacheKey = `metrics_summary:${homeId}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}
  const devicesCount = await prisma.device.count({ where: { owner_id: homeId } });
  const metricsCount = await prisma.metric.count({ where: { device: { owner_id: homeId } } });
  const openAlertsCount = await prisma.alert.count({ where: { status: 'new', metric: { device: { owner_id: homeId } } } });
  const summary = {
    devices: devicesCount,
    metrics: metricsCount,
    openAlerts: openAlertsCount,
  };
  const response = { status: 'ok', data: summary };
  try {
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
  } catch {}
  res.json(response);
});

app.get('/system/logs', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  try {
    const logs = await redisClient.lRange('logs', start, end);
    const total = await redisClient.lLen('logs');
    const parsedLogs = logs.map(log => JSON.parse(log));
    res.json({ status: 'ok', data: parsedLogs, total, page, limit });
  } catch {
    res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
  }
});

io.on('connection', (socket: Socket) => {
  logger.info('WebSocket connected', { socketId: socket.id });

  socket.on('subscribe_metrics', (metricIds: string[]) => {
    metricIds.forEach(id => socket.join(`metric:${id}`));
    logger.info('Subscribed to metrics', { socketId: socket.id, metricIds });
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected', { socketId: socket.id });
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

