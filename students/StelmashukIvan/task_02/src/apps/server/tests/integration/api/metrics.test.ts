// apps/server/tests/integration/api/metrics.test.ts
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

// Моки
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    metric: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    device: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    reading: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn(),
    alert: {
      create: jest.fn()
    }
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    connect: jest.fn(),
    lPush: jest.fn(),
    lTrim: jest.fn()
  }))
}));

import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// Тип для Request с user
interface AuthRequest extends express.Request {
  user?: {
    id: string;
    role: string;
  };
}

describe('Metrics API Integration Tests', () => {
  let app: express.Application;
  let mockPrisma: any;
  let mockRedisClient: any;

  // Схемы валидации
  const MetricSchema = z.object({
    device_id: z.string().uuid(),
    name: z.string().min(1),
    unit: z.string().min(1),
  });

  const MetricSchemaPartial = MetricSchema.partial();

  const ReadingSchema = z.object({
    metric_id: z.string().uuid(),
    timestamp: z.string().datetime(),
    value: z.number(),
  });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.PORT = '3000';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Инициализируем моки
    const prisma = new PrismaClient();
    mockPrisma = prisma;
    mockRedisClient = createClient();

    // Создаем тестовое приложение
    app = express();
    app.use(helmet());
    app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost'],
      credentials: true
    }));
    app.use(express.json());
  });

  describe('GET /metrics', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      // Middleware для установки пользователя
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/metrics', async (req: AuthRequest, res) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const name = req.query.name as string;
          const device_id = req.query.device_id as string;

          const where: any = {};
          if (name) where.name = { contains: name, mode: 'insensitive' };
          if (device_id) where.device_id = device_id;

          const [metrics, total] = await Promise.all([
            mockPrisma.metric.findMany({
              where,
              skip,
              take: limit,
              include: { device: true }
            }),
            mockPrisma.metric.count({ where })
          ]);

          res.json({ status: 'ok', data: metrics, total, page, limit });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should return metrics with pagination and include device', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          device_id: 'device-1',
          name: 'Temperature',
          unit: '°C',
          device: {
            id: 'device-1',
            name: 'Smart Thermostat',
            owner_id: 'user-123'
          }
        }
      ];

      mockPrisma.metric.findMany.mockResolvedValue(mockMetrics);
      mockPrisma.metric.count.mockResolvedValue(1);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: mockMetrics,
        total: 1,
        page: 1,
        limit: 10
      });

      expect(mockPrisma.metric.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: { device: true }
      });
    });

    test('should filter metrics by name', async () => {
      mockPrisma.metric.findMany.mockResolvedValue([]);
      mockPrisma.metric.count.mockResolvedValue(0);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/metrics?name=temperature')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.metric.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'temperature', mode: 'insensitive' }
        },
        skip: 0,
        take: 10,
        include: { device: true }
      });
    });

    test('should filter metrics by device_id', async () => {
      mockPrisma.metric.findMany.mockResolvedValue([]);
      mockPrisma.metric.count.mockResolvedValue(0);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/metrics?device_id=device-1')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.metric.findMany).toHaveBeenCalledWith({
        where: {
          device_id: 'device-1'
        },
        skip: 0,
        take: 10,
        include: { device: true }
      });
    });
  });

  describe('POST /metrics', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.post('/metrics', async (req: AuthRequest, res) => {
        try {
          const data = MetricSchema.parse(req.body);
          const device = await mockPrisma.device.findUnique({ 
            where: { id: data.device_id } 
          });
          
          if (!device || (req.user?.role !== 'admin' && device.owner_id !== req.user?.id)) {
            throw new Error('Unauthorized');
          }
          
          const metric = await mockPrisma.metric.create({ data });
          res.status(201).json({ status: 'ok', data: metric });
        } catch (error) {
          res.status(400).json({ status: 'error' });
        }
      });

      return router;
    };

    test('should create new metric for user who owns device', async () => {
      const metricData = {
        device_id: 'device-1',
        name: 'Humidity',
        unit: '%'
      };

      const deviceData = {
        id: 'device-1',
        name: 'Test Device',
        owner_id: 'user-123'
      };

      const createdMetric = {
        id: 'new-metric-id',
        ...metricData
      };

      mockPrisma.device.findUnique.mockResolvedValue(deviceData);
      mockPrisma.metric.create.mockResolvedValue(createdMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/metrics')
        .set('Authorization', 'Bearer valid-token')
        .send(metricData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'ok',
        data: createdMetric
      });
    });

    test('should reject metric creation for non-existent device', async () => {
      const metricData = {
        device_id: 'non-existent-device',
        name: 'Temperature',
        unit: '°C'
      };

      mockPrisma.device.findUnique.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/metrics')
        .set('Authorization', 'Bearer valid-token')
        .send(metricData);

      expect(response.status).toBe(400);
    });

    test('should reject metric creation for device owned by other user', async () => {
      const metricData = {
        device_id: 'device-1',
        name: 'Temperature',
        unit: '°C'
      };

      const deviceData = {
        id: 'device-1',
        name: 'Other User Device',
        owner_id: 'other-user-id'
      };

      mockPrisma.device.findUnique.mockResolvedValue(deviceData);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/metrics')
        .set('Authorization', 'Bearer valid-token')
        .send(metricData);

      expect(response.status).toBe(400);
    });

    test('should allow admin to create metric for any device', async () => {
      const metricData = {
        device_id: 'device-1',
        name: 'Temperature',
        unit: '°C'
      };

      const deviceData = {
        id: 'device-1',
        name: 'Other User Device',
        owner_id: 'other-user-id'
      };

      const createdMetric = {
        id: 'new-metric-id',
        ...metricData
      };

      mockPrisma.device.findUnique.mockResolvedValue(deviceData);
      mockPrisma.metric.create.mockResolvedValue(createdMetric);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/metrics')
        .set('Authorization', 'Bearer admin-token')
        .send(metricData);

      expect(response.status).toBe(201);
    });
  });

  describe('GET /metrics/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/metrics/:id', async (req: AuthRequest, res) => {
        try {
          const metric = await mockPrisma.metric.findUnique({ 
            where: { id: req.params.id }, 
            include: { device: true } 
          });
          
          if (!metric || (req.user?.role !== 'admin' && metric.device.owner_id !== req.user?.id)) {
            return res.status(404).json({ status: 'error' });
          }
          
          res.json({ status: 'ok', data: metric });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should return metric details for device owner', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Temperature',
        unit: '°C',
        device: {
          id: 'device-1',
          name: 'Test Device',
          owner_id: 'user-123'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: mockMetric
      });
    });

    test('should return 404 for non-existent metric', async () => {
      mockPrisma.metric.findUnique.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/non-existent-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    test('should return 404 for metric owned by other user', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Temperature',
        unit: '°C',
        device: {
          id: 'device-1',
          name: 'Other User Device',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    test('should allow admin to access any metric', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Temperature',
        unit: '°C',
        device: {
          id: 'device-1',
          name: 'Other User Device',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /metrics/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.put('/metrics/:id', async (req: AuthRequest, res) => {
        try {
          const metric = await mockPrisma.metric.findUnique({ 
            where: { id: req.params.id }, 
            include: { device: true } 
          });
          
          if (!metric || (req.user?.role !== 'admin' && metric.device.owner_id !== req.user?.id)) {
            return res.status(403).json({ status: 'error' });
          }
          
          const data = MetricSchemaPartial.parse(req.body);
          const updated = await mockPrisma.metric.update({ 
            where: { id: req.params.id }, 
            data 
          });
          res.json({ status: 'ok', data: updated });
        } catch (error) {
          res.status(400).json({ status: 'error' });
        }
      });

      return router;
    };

    test('should update metric for device owner', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Old Name',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'user-123'
        }
      };

      const updateData = {
        name: 'Updated Name',
        unit: '°F'
      };

      const updatedMetric = {
        ...existingMetric,
        ...updateData
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);
      mockPrisma.metric.update.mockResolvedValue(updatedMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .put('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: updatedMetric
      });
    });

    test('should reject update for non-owner', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Old Name',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .put('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });

    test('should allow admin to update any metric', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Old Name',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'other-user-id'
        }
      };

      const updatedMetric = {
        ...existingMetric,
        name: 'Admin Updated Name'
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);
      mockPrisma.metric.update.mockResolvedValue(updatedMetric);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .put('/api/metrics/metric-1')
        .set('Authorization', 'Bearer admin-token')
        .send({ name: 'Admin Updated Name' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /metrics/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.delete('/metrics/:id', async (req: AuthRequest, res) => {
        try {
          const metric = await mockPrisma.metric.findUnique({ 
            where: { id: req.params.id }, 
            include: { device: true } 
          });
          
          if (!metric || (req.user?.role !== 'admin' && metric.device.owner_id !== req.user?.id)) {
            return res.status(403).json({ status: 'error' });
          }
          
          await mockPrisma.metric.delete({ where: { id: req.params.id } });
          res.json({ status: 'ok' });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should delete metric for device owner', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Test Metric',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'user-123'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);
      mockPrisma.metric.delete.mockResolvedValue(existingMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .delete('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });

    test('should reject delete for non-owner', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Other User Metric',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .delete('/api/metrics/metric-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    test('should allow admin to delete any metric', async () => {
      const existingMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        name: 'Other User Metric',
        unit: '°C',
        device: {
          id: 'device-1',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(existingMetric);
      mockPrisma.metric.delete.mockResolvedValue(existingMetric);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .delete('/api/metrics/metric-1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /metrics/:id/readings', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/metrics/:id/readings', async (req: AuthRequest, res) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const start_time = req.query.start_time ? new Date(req.query.start_time as string) : undefined;
          const end_time = req.query.end_time ? new Date(req.query.end_time as string) : undefined;
          const min_value = req.query.min_value ? parseFloat(req.query.min_value as string) : undefined;
          const max_value = req.query.max_value ? parseFloat(req.query.max_value as string) : undefined;

          // Проверка кэша
          const cacheKey = `readings:${req.params.id}:${req.user?.id}:${page}:${limit}:${start_time?.toISOString() || ''}:${end_time?.toISOString() || ''}:${min_value || ''}:${max_value || ''}`;
          
          try {
            const cached = await mockRedisClient.get(cacheKey);
            if (cached) {
              return res.json(JSON.parse(cached));
            }
          } catch {}

          // Проверка прав доступа к метрике
          const metric = await mockPrisma.metric.findUnique({ 
            where: { id: req.params.id }, 
            include: { device: true } 
          });
          
          if (!metric || (req.user?.role !== 'admin' && metric.device.owner_id !== req.user?.id)) {
            return res.status(404).json({ status: 'error' });
          }

          // Фильтрация
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
            mockPrisma.reading.findMany({ 
              where, 
              skip, 
              take: limit, 
              orderBy: { timestamp: 'desc' } 
            }),
            mockPrisma.reading.count({ where })
          ]);

          const response = { status: 'ok', data: readings, total, page, limit };
          
          // Кэширование
          try {
            await mockRedisClient.set(cacheKey, JSON.stringify(response), { EX: 60 });
          } catch {}
          
          res.json(response);
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should return readings for metric with caching', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        device: {
          id: 'device-1',
          owner_id: 'user-123'
        }
      };

      const mockReadings = [
        {
          id: 'reading-1',
          metric_id: 'metric-1',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          value: 25.5
        }
      ];

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.reading.findMany.mockResolvedValue(mockReadings);
      mockPrisma.reading.count.mockResolvedValue(1);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1/readings?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: mockReadings,
        total: 1,
        page: 1,
        limit: 10
      });

      // Проверяем, что использовалось кэширование
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test('should return cached readings when available', async () => {
      const cachedResponse = {
        status: 'ok',
        data: [{ id: 'cached-reading', value: 25 }],
        total: 1,
        page: 1,
        limit: 10
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1/readings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(cachedResponse);
      
      // Не должны вызывать базу данных, если есть кэш
      expect(mockPrisma.metric.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.reading.findMany).not.toHaveBeenCalled();
    });

    test('should filter readings by time range', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        device: {
          id: 'device-1',
          owner_id: 'user-123'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.reading.findMany.mockResolvedValue([]);
      mockPrisma.reading.count.mockResolvedValue(0);
      mockRedisClient.get.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/metrics/metric-1/readings?start_time=2024-01-01T00:00:00Z&end_time=2024-01-31T23:59:59Z')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.reading.findMany).toHaveBeenCalledWith({
        where: {
          metric_id: 'metric-1',
          timestamp: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-31T23:59:59Z')
          }
        },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' }
      });
    });

    test('should filter readings by value range', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        device: {
          id: 'device-1',
          owner_id: 'user-123'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.reading.findMany.mockResolvedValue([]);
      mockPrisma.reading.count.mockResolvedValue(0);
      mockRedisClient.get.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/metrics/metric-1/readings?min_value=20&max_value=30')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.reading.findMany).toHaveBeenCalledWith({
        where: {
          metric_id: 'metric-1',
          value: {
            gte: 20,
            lte: 30
          }
        },
        skip: 0,
        take: 10,
        orderBy: { timestamp: 'desc' }
      });
    });

    test('should return 404 for non-existent metric', async () => {
      mockPrisma.metric.findUnique.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/non-existent-id/readings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    test('should return 404 for metric owned by other user', async () => {
      const mockMetric = {
        id: 'metric-1',
        device_id: 'device-1',
        device: {
          id: 'device-1',
          owner_id: 'other-user-id'
        }
      };

      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockRedisClient.get.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/metrics/metric-1/readings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });
  });
});