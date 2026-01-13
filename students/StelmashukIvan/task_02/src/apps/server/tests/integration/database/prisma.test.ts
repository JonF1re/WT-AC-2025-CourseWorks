import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Prisma Database Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.alert.deleteMany();
    await prisma.alertRule.deleteMany();
    await prisma.reading.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.metric.deleteMany();
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('User Model', () => {
    it('should create user with valid data', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          password_hash: 'hashedpass',
          role: 'user',
        },
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('user');
      expect(user.password_hash).toBe('hashedpass');
    });

    it('should enforce unique username constraint', async () => {
      await prisma.user.create({
        data: {
          username: 'duplicate',
          password_hash: 'pass1',
          role: 'user',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            username: 'duplicate',
            password_hash: 'pass2',
            role: 'admin',
          },
        })
      ).rejects.toThrow();
    });

    it('should have UUID id', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'uuidtest',
          password_hash: 'pass',
          role: 'user',
        },
      });

      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Device Model', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'deviceowner',
          password_hash: 'pass',
          role: 'user',
        },
      });
      userId = user.id;
    });

    it('should create device with owner', async () => {
      const device = await prisma.device.create({
        data: {
          name: 'Test Device',
          description: 'Test Description',
          location: 'Test Location',
          type: 'sensor',
          owner_id: userId,
        },
      });

      expect(device.name).toBe('Test Device');
      expect(device.owner_id).toBe(userId);
      expect(device.description).toBe('Test Description');
    });

    it('should cascade delete when owner is deleted', async () => {
      const device = await prisma.device.create({
        data: {
          name: 'ToDelete',
          owner_id: userId,
        },
      });

      await prisma.user.delete({ where: { id: userId } });

      const foundDevice = await prisma.device.findUnique({
        where: { id: device.id },
      });
      expect(foundDevice).toBeNull();
    });
  });

  describe('Metric Model', () => {
    let deviceId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'metricuser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Metric Device',
          owner_id: user.id,
        },
      });
      deviceId = device.id;
    });

    it('should create metric linked to device', async () => {
      const metric = await prisma.metric.create({
        data: {
          device_id: deviceId,
          name: 'Temperature',
          unit: '°C',
        },
      });

      expect(metric.device_id).toBe(deviceId);
      expect(metric.name).toBe('Temperature');
      expect(metric.unit).toBe('°C');
    });

    it('should cascade delete when device is deleted', async () => {
      const metric = await prisma.metric.create({
        data: {
          device_id: deviceId,
          name: 'Temp',
          unit: '°C',
        },
      });

      await prisma.device.delete({ where: { id: deviceId } });

      const foundMetric = await prisma.metric.findUnique({
        where: { id: metric.id },
      });
      expect(foundMetric).toBeNull();
    });
  });

  describe('Reading Model', () => {
    let metricId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'readinguser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Reading Device',
          owner_id: user.id,
        },
      });

      const metric = await prisma.metric.create({
        data: {
          device_id: device.id,
          name: 'Humidity',
          unit: '%',
        },
      });
      metricId = metric.id;
    });

    it('should create reading with timestamp and value', async () => {
      const timestamp = new Date('2023-12-17T10:00:00Z');
      const reading = await prisma.reading.create({
        data: {
          metric_id: metricId,
          timestamp,
          value: 42.5,
        },
      });

      expect(reading.metric_id).toBe(metricId);
      expect(reading.timestamp).toEqual(timestamp);
      expect(reading.value).toBe(42.5);
    });

    it('should cascade delete when metric is deleted', async () => {
      const reading = await prisma.reading.create({
        data: {
          metric_id: metricId,
          timestamp: new Date(),
          value: 100,
        },
      });

      await prisma.metric.delete({ where: { id: metricId } });

      const foundReading = await prisma.reading.findUnique({
        where: { id: reading.id },
      });
      expect(foundReading).toBeNull();
    });
  });

  describe('Alert Model', () => {
    let metricId: string;
    let readingId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'alertuser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Alert Device',
          owner_id: user.id,
        },
      });

      const metric = await prisma.metric.create({
        data: {
          device_id: device.id,
          name: 'Pressure',
          unit: 'Pa',
        },
      });
      metricId = metric.id;

      const reading = await prisma.reading.create({
        data: {
          metric_id: metricId,
          timestamp: new Date(),
          value: 1013.25,
        },
      });
      readingId = reading.id;
    });

    it('should create alert with all fields', async () => {
      const alert = await prisma.alert.create({
        data: {
          metric_id: metricId,
          reading_id: readingId,
          level: 'warning',
          status: 'new',
          threshold: 1000,
          message: 'Pressure too high',
        },
      });

      expect(alert.metric_id).toBe(metricId);
      expect(alert.reading_id).toBe(readingId);
      expect(alert.level).toBe('warning');
      expect(alert.status).toBe('new');
      expect(alert.threshold).toBe(1000);
      expect(alert.message).toBe('Pressure too high');
      expect(alert.created_at).toBeDefined();
    });

    it('should create alert without reading', async () => {
      const alert = await prisma.alert.create({
        data: {
          metric_id: metricId,
          level: 'info',
          status: 'new',
          message: 'Test alert',
        },
      });

      expect(alert.reading_id).toBeNull();
    });

    it('should cascade delete when metric is deleted', async () => {
      const alert = await prisma.alert.create({
        data: {
          metric_id: metricId,
          level: 'critical',
          status: 'new',
          message: 'Test',
        },
      });

      await prisma.metric.delete({ where: { id: metricId } });

      const foundAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      expect(foundAlert).toBeNull();
    });

    it('should set reading to null when reading is deleted', async () => {
      const alert = await prisma.alert.create({
        data: {
          metric_id: metricId,
          reading_id: readingId,
          level: 'warning',
          status: 'new',
          message: 'Test',
        },
      });

      await prisma.reading.delete({ where: { id: readingId } });

      const updatedAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      expect(updatedAlert?.reading_id).toBeNull();
    });
  });

  describe('Ticket Model', () => {
    let userId: string;
    let deviceId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'ticketuser',
          password_hash: 'pass',
          role: 'user',
        },
      });
      userId = user.id;

      const device = await prisma.device.create({
        data: {
          name: 'Ticket Device',
          owner_id: userId,
        },
      });
      deviceId = device.id;
    });

    it('should create ticket with optional device', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          type: 'add',
          status: 'open',
          object: 'device',
          comment: 'Add new device',
          requester_id: userId,
          device_id: deviceId,
        },
      });

      expect(ticket.requester_id).toBe(userId);
      expect(ticket.device_id).toBe(deviceId);
      expect(ticket.type).toBe('add');
      expect(ticket.object).toBe('device');
    });

    it('should create ticket without device', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          type: 'edit',
          status: 'pending',
          requester_id: userId,
        },
      });

      expect(ticket.device_id).toBeNull();
      expect(ticket.object).toBeNull();
    });

    it('should not delete user when ticket exists', async () => {
      await prisma.ticket.create({
        data: {
          type: 'delete',
          status: 'open',
          requester_id: userId,
        },
      });

      await expect(
        prisma.user.delete({ where: { id: userId } })
      ).rejects.toThrow();
    });

    it('should set device_id to null when device is deleted', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          type: 'edit',
          status: 'open',
          requester_id: userId,
          device_id: deviceId,
        },
      });

      await prisma.device.delete({ where: { id: deviceId } });

      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });
      expect(updatedTicket?.device_id).toBeNull();
    });
  });

  describe('AlertRule Model', () => {
    let metricId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          username: 'ruleuser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Rule Device',
          owner_id: user.id,
        },
      });

      const metric = await prisma.metric.create({
        data: {
          device_id: device.id,
          name: 'Voltage',
          unit: 'V',
        },
      });
      metricId = metric.id;
    });

    it('should create alert rule with condition', async () => {
      const rule = await prisma.alertRule.create({
        data: {
          metric_id: metricId,
          condition: '>',
          threshold: 220,
          level: 'critical',
          message_template: 'Voltage exceeds {threshold}V',
        },
      });

      expect(rule.metric_id).toBe(metricId);
      expect(rule.condition).toBe('>');
      expect(rule.threshold).toBe(220);
      expect(rule.level).toBe('critical');
      expect(rule.message_template).toBe('Voltage exceeds {threshold}V');
    });

    it('should cascade delete when metric is deleted', async () => {
      const rule = await prisma.alertRule.create({
        data: {
          metric_id: metricId,
          condition: '<',
          threshold: 100,
          level: 'warning',
          message_template: 'Test',
        },
      });

      await prisma.metric.delete({ where: { id: metricId } });

      const foundRule = await prisma.alertRule.findUnique({
        where: { id: rule.id },
      });
      expect(foundRule).toBeNull();
    });
  });

  describe('Relationships', () => {
    it('should maintain user-device-metric-reading-alert chain', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'chainuser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Chain Device',
          owner_id: user.id,
        },
      });

      const metric = await prisma.metric.create({
        data: {
          device_id: device.id,
          name: 'Current',
          unit: 'A',
        },
      });

      const reading = await prisma.reading.create({
        data: {
          metric_id: metric.id,
          timestamp: new Date(),
          value: 5.5,
        },
      });

      const alert = await prisma.alert.create({
        data: {
          metric_id: metric.id,
          reading_id: reading.id,
          level: 'warning',
          status: 'new',
          message: 'High current',
        },
      });

      const alertRule = await prisma.alertRule.create({
        data: {
          metric_id: metric.id,
          condition: '>',
          threshold: 5.0,
          level: 'warning',
          message_template: 'Current high',
        },
      });

      const ticket = await prisma.ticket.create({
        data: {
          type: 'add',
          status: 'open',
          requester_id: user.id,
          device_id: device.id,
        },
      });

      const userWithRelations = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          devices: {
            include: {
              metrics: {
                include: {
                  readings: true,
                  alerts: true,
                  alertRules: true,
                },
              },
              tickets: true,
            },
          },
          tickets: true,
        },
      });

      expect(userWithRelations?.devices).toHaveLength(1);
      expect(userWithRelations?.devices[0].metrics).toHaveLength(1);
      expect(userWithRelations?.devices[0].metrics[0].readings).toHaveLength(1);
      expect(userWithRelations?.devices[0].metrics[0].alerts).toHaveLength(1);
      expect(userWithRelations?.devices[0].metrics[0].alertRules).toHaveLength(1);
      expect(userWithRelations?.devices[0].tickets).toHaveLength(1);
      expect(userWithRelations?.tickets).toHaveLength(1);
    });

    it('should cascade delete entire chain', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'cascadeuser',
          password_hash: 'pass',
          role: 'user',
        },
      });

      const device = await prisma.device.create({
        data: {
          name: 'Cascade Device',
          owner_id: user.id,
        },
      });

      const metric = await prisma.metric.create({
        data: {
          device_id: device.id,
          name: 'Test',
          unit: 'U',
        },
      });

      await prisma.reading.create({
        data: {
          metric_id: metric.id,
          timestamp: new Date(),
          value: 1,
        },
      });

      await prisma.alert.create({
        data: {
          metric_id: metric.id,
          level: 'info',
          status: 'new',
          message: 'Test',
        },
      });

      await prisma.alertRule.create({
        data: {
          metric_id: metric.id,
          condition: '>',
          threshold: 0,
          level: 'info',
          message_template: 'Test',
        },
      });

      await prisma.user.delete({ where: { id: user.id } });

      const devices = await prisma.device.findMany();
      const metrics = await prisma.metric.findMany();
      const readings = await prisma.reading.findMany();
      const alerts = await prisma.alert.findMany();
      const alertRules = await prisma.alertRule.findMany();

      expect(devices).toHaveLength(0);
      expect(metrics).toHaveLength(0);
      expect(readings).toHaveLength(0);
      expect(alerts).toHaveLength(0);
      expect(alertRules).toHaveLength(0);
    });
  });

  describe('Seed Data Validation', () => {
    it('should validate seed data schema', async () => {
      const { seed } = require('../../../prisma/seed.ts');
      
      await expect(seed()).resolves.not.toThrow();
    });

    it('should create all seed entities', async () => {
      const { seed } = require('../../../prisma/seed.ts');
      await seed();

      const users = await prisma.user.findMany();
      const devices = await prisma.device.findMany();
      const metrics = await prisma.metric.findMany();
      const readings = await prisma.reading.findMany();
      const alerts = await prisma.alert.findMany();
      const tickets = await prisma.ticket.findMany();
      const alertRules = await prisma.alertRule.findMany();

      expect(users).toHaveLength(3);
      expect(devices).toHaveLength(3);
      expect(metrics).toHaveLength(3);
      expect(readings).toHaveLength(3);
      expect(alerts).toHaveLength(2);
      expect(tickets).toHaveLength(2);
      expect(alertRules).toHaveLength(2);
    });
  });
});