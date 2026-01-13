// apps/server/tests/integration/api/devices.test.ts
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

// Моки
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    device: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    connect: jest.fn(),
    lPush: jest.fn(),
    lTrim: jest.fn(),
    lRange: jest.fn(),
    lLen: jest.fn()
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

describe('Devices API Integration Tests', () => {
  let app: express.Application;
  let mockPrisma: any;
  let mockRedisClient: any;

  // Схемы валидации
  const DeviceSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
    owner_id: z.string().uuid(),
    type: z.string().optional(),
  });

  const DeviceSchemaPartial = DeviceSchema.partial();

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

  describe('GET /devices', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      // Middleware для установки пользователя
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/devices', async (req: AuthRequest, res) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          const name = req.query.name as string;
          const location = req.query.location as string;
          
          const where: any = req.user?.role === 'admin' ? {} : { owner_id: req.user?.id };
          if (name) where.name = { contains: name, mode: 'insensitive' };
          if (location) where.location = { contains: location, mode: 'insensitive' };
          
          const [devices, total] = await Promise.all([
            mockPrisma.device.findMany({ where, skip, take: limit }),
            mockPrisma.device.count({ where }),
          ]);
          
          res.json({ status: 'ok', data: devices, total, page, limit });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should return devices for user with pagination', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Smart Thermostat',
          description: 'Living room thermostat',
          location: 'Living Room',
          type: 'thermostat',
          owner_id: 'user-123'
        }
      ];

      mockPrisma.device.findMany.mockResolvedValue(mockDevices);
      mockPrisma.device.count.mockResolvedValue(1);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/devices?page=1&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: mockDevices,
        total: 1,
        page: 1,
        limit: 10
      });

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { owner_id: 'user-123' },
        skip: 0,
        take: 10
      });
    });

    test('should return all devices for admin', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Device 1',
          owner_id: 'user-1'
        },
        {
          id: 'device-2',
          name: 'Device 2',
          owner_id: 'user-2'
        }
      ];

      mockPrisma.device.findMany.mockResolvedValue(mockDevices);
      mockPrisma.device.count.mockResolvedValue(2);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/devices')
        .set('Authorization', 'Bearer admin-token');

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10
      });
    });

    test('should filter devices by name', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);
      mockPrisma.device.count.mockResolvedValue(0);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      await request(app)
        .get('/api/devices?name=thermostat')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: {
          owner_id: 'user-123',
          name: { contains: 'thermostat', mode: 'insensitive' }
        },
        skip: 0,
        take: 10
      });
    });
  });

  describe('POST /devices', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.post('/devices', async (req: AuthRequest, res) => {
        try {
          const data = DeviceSchema.parse(req.body);
          
          if (req.user?.role !== 'admin' && data.owner_id !== req.user?.id) {
            return res.status(400).json({ 
              status: 'error', 
              error: { code: 'validation_failed' } 
            });
          }
          
          const device = await mockPrisma.device.create({ data });
          res.status(201).json({ status: 'ok', data: device });
        } catch (error) {
          res.status(400).json({ status: 'error', error: { code: 'validation_failed' } });
        }
      });

      return router;
    };

    test('should create new device for user', async () => {
      const deviceData = {
        name: 'New Device',
        description: 'Test device',
        location: 'Test Room',
        owner_id: 'user-123',
        type: 'sensor'
      };

      const createdDevice = {
        id: 'new-device-id',
        ...deviceData
      };

      mockPrisma.device.create.mockResolvedValue(createdDevice);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', 'Bearer valid-token')
        .send(deviceData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'ok',
        data: createdDevice
      });
    });

    test('should reject device creation with invalid data', async () => {
      const invalidDeviceData = {
        name: '',
        owner_id: 'user-123'
      };

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidDeviceData);

      expect(response.status).toBe(400);
    });

    test('should reject device creation for other user by non-admin', async () => {
      const deviceData = {
        name: 'New Device',
        owner_id: 'other-user-id'
      };

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', 'Bearer valid-token')
        .send(deviceData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /devices/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/devices/:id', async (req: AuthRequest, res) => {
        try {
          const device = await mockPrisma.device.findUnique({ 
            where: { id: req.params.id }, 
            include: { metrics: true } 
          });
          
          if (!device || (req.user?.role !== 'admin' && device.owner_id !== req.user?.id)) {
            return res.status(404).json({ status: 'error' });
          }
          
          res.json({ status: 'ok', data: device });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should return device details for owner', async () => {
      const mockDevice = {
        id: 'device-1',
        name: 'Test Device',
        owner_id: 'user-123',
        metrics: []
      };

      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/devices/device-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: mockDevice
      });
    });

    test('should return 404 for non-existent device', async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/devices/non-existent-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
    });

    test('should allow admin to access any device', async () => {
      const mockDevice = {
        id: 'device-1',
        name: 'Other User Device',
        owner_id: 'other-user-id',
        metrics: []
      };

      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/devices/device-1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /devices/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.put('/devices/:id', async (req: AuthRequest, res) => {
        try {
          const device = await mockPrisma.device.findUnique({ where: { id: req.params.id } });
          
          if (!device || (req.user?.role !== 'admin' && device.owner_id !== req.user?.id)) {
            return res.status(403).json({ status: 'error' });
          }
          
          const data = DeviceSchemaPartial.parse(req.body);
          const updated = await mockPrisma.device.update({ where: { id: req.params.id }, data });
          res.json({ status: 'ok', data: updated });
        } catch (error) {
          res.status(400).json({ status: 'error' });
        }
      });

      return router;
    };

    test('should update device for owner', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Old Name',
        owner_id: 'user-123'
      };

      const updateData = {
        name: 'Updated Name',
        location: 'New Location'
      };

      const updatedDevice = {
        ...existingDevice,
        ...updateData
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);
      mockPrisma.device.update.mockResolvedValue(updatedDevice);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .put('/api/devices/device-1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        data: updatedDevice
      });
    });

    test('should reject update for non-owner', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Other User Device',
        owner_id: 'other-user-id'
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .put('/api/devices/device-1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /devices/:id', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.delete('/devices/:id', async (req: AuthRequest, res) => {
        try {
          const device = await mockPrisma.device.findUnique({ where: { id: req.params.id } });
          
          if (!device || (req.user?.role !== 'admin' && device.owner_id !== req.user?.id)) {
            return res.status(403).json({ status: 'error' });
          }
          
          await mockPrisma.device.delete({ where: { id: req.params.id } });
          res.json({ status: 'ok' });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should delete device for owner', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Test Device',
        owner_id: 'user-123'
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);
      mockPrisma.device.delete.mockResolvedValue(existingDevice);

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .delete('/api/devices/device-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });

    test('should allow admin to delete any device', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Other User Device',
        owner_id: 'other-user-id'
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);
      mockPrisma.device.delete.mockResolvedValue(existingDevice);

      const user = { id: 'admin-id', role: 'admin' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .delete('/api/devices/device-1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    const setupTestRoute = (user: any) => {
      const router = express.Router();
      
      router.use((req: AuthRequest, res, next) => {
        req.user = user;
        next();
      });

      router.get('/devices', async (req: AuthRequest, res) => {
        try {
          const page = parseInt(req.query.page as string) || 1;
          const limit = parseInt(req.query.limit as string) || 10;
          const skip = (page - 1) * limit;
          
          const where: any = req.user?.role === 'admin' ? {} : { owner_id: req.user?.id };
          
          const [devices, total] = await Promise.all([
            mockPrisma.device.findMany({ where, skip, take: limit }),
            mockPrisma.device.count({ where }),
          ]);
          
          res.json({ status: 'ok', data: devices, total, page, limit });
        } catch (error) {
          res.status(500).json({ status: 'error', error: { code: 'internal_error' } });
        }
      });

      return router;
    };

    test('should handle database errors gracefully', async () => {
      mockPrisma.device.findMany.mockRejectedValue(new Error('Database error'));

      const user = { id: 'user-123', role: 'user' };
      app.use('/api', setupTestRoute(user));

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
    });
  });
});