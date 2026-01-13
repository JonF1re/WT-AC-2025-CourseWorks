import { checkRules } from '../../../src/alerts/alertsEngine';
import { PrismaClient, Reading, AlertRule, Metric, Device, User, Alert } from '@prisma/client';
import { createClient } from 'redis';

jest.mock('@prisma/client');
jest.mock('redis');

const mockPrisma = {
  alertRule: {
    findMany: jest.fn()
  },
  metric: {
    findUnique: jest.fn()
  },
  alert: {
    create: jest.fn()
  }
};

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  connect: jest.fn()
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
(createClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('Alerts Engine Notifications', () => {
  let mockReading: Reading;
  let mockAlertRule: AlertRule;
  let mockMetric: Metric & { device: Device };
  let mockUser: User;
  let mockIo: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'user-123',
      username: 'testuser',
      password_hash: 'hash',
      role: 'user'
    } as User;

    const mockDevice: Device = {
      id: 'device-123',
      name: 'Test Device',
      description: 'Test Description',
      location: 'Test Location',
      type: 'sensor',
      owner_id: mockUser.id
    } as Device;

    mockMetric = {
      id: 'metric-123',
      device_id: 'device-123',
      name: 'Temperature',
      unit: '°C',
      device: mockDevice
    } as Metric & { device: Device };

    mockReading = {
      id: 'reading-123',
      metric_id: 'metric-123',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      value: 35.5
    } as Reading;

    mockAlertRule = {
      id: 'rule-123',
      metric_id: 'metric-123',
      condition: '>',
      threshold: 30,
      level: 'critical',
      message_template: 'Temperature is {value}°C, exceeding {threshold}°C'
    } as AlertRule;

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Socket.IO Notifications', () => {
    test('should send socket notification to device owner when alert is created', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'critical',
        status: 'new',
        threshold: 30,
        message: 'Temperature is 35.5°C, exceeding 30°C',
        created_at: new Date()
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(mockReading, mockIo);

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
      expect(mockIo.emit).toHaveBeenCalledWith('new_alert', mockAlert);
    });

    test('should not send socket notification when io parameter is not provided', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, undefined);

      expect(mockIo.to).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    test('should not send socket notification when device has no owner', async () => {
      const metricWithoutOwner: Metric & { device: Device } = {
        ...mockMetric,
        device: {
          ...mockMetric.device,
          owner_id: ''
        }
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(metricWithoutOwner);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockIo.to).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    test('should send notifications for multiple alerts to same user', async () => {
      const rules: AlertRule[] = [
        { ...mockAlertRule, id: 'rule-1', condition: '>', threshold: 30, level: 'critical' },
        { ...mockAlertRule, id: 'rule-2', condition: '>', threshold: 25, level: 'warning' }
      ];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(rules));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockIo.to).toHaveBeenCalledTimes(2);
      expect(mockIo.emit).toHaveBeenCalledTimes(2);
      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
    });

    test('should handle socket.io errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);
      
      mockIo.emit.mockImplementation(() => {
        throw new Error('Socket.IO error');
      });

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Alert Message Formatting', () => {
    test('should format alert messages according to template', async () => {
      const templateRule: AlertRule = {
        ...mockAlertRule,
        message_template: 'ALERT: {metricName} = {value}{unit}, Threshold: {threshold}{unit}'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([templateRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'critical',
        status: 'new',
        threshold: 30,
        message: 'ALERT: Temperature = 35.5°C, Threshold: 30°C'
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'ALERT: Temperature = 35.5°C, Threshold: 30°C'
        })
      });
    });

    test('should handle missing template variables gracefully', async () => {
      const incompleteRule: AlertRule = {
        ...mockAlertRule,
        message_template: 'Alert for {metricName}'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([incompleteRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'critical',
        status: 'new',
        threshold: 30,
        message: 'Alert for Temperature'
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Alert for Temperature'
        })
      });
    });
  });

  describe('Alert Levels and Status', () => {
    test('should create alerts with correct level from rule', async () => {
      const levels = ['info', 'warning', 'critical'];
      
      for (const level of levels) {
        const levelRule: AlertRule = {
          ...mockAlertRule,
          level: level as any
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify([levelRule]));
        mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
        mockPrisma.alert.create.mockResolvedValue({} as Alert);

        await checkRules(mockReading, mockIo);

        expect(mockPrisma.alert.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            level: level
          })
        });
        
        jest.clearAllMocks();
      }
    });

    test('should always create alerts with status "new"', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'new'
        })
      });
    });
  });

  describe('Error Handling and Logging', () => {
    test('should log errors when Redis connection fails', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error in checkRules for reading ${mockReading.id}:`,
        expect.any(Error)
      );
    });

    test('should log errors when database query fails', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockRejectedValue(new Error('Database query failed'));

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error in checkRules for reading ${mockReading.id}:`,
        expect.any(Error)
      );
    });

    test('should continue processing other rules when one fails', async () => {
      const rules: AlertRule[] = [
        mockAlertRule,
        { ...mockAlertRule, id: 'rule-2', condition: '>', threshold: 25 }
      ];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(rules));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      mockPrisma.alert.create
        .mockRejectedValueOnce(new Error('First alert creation failed'))
        .mockResolvedValueOnce({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Caching', () => {
    test('should use cached rules when available', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockRedisClient.get).toHaveBeenCalledWith('alert_rules:metric-123');
      expect(mockPrisma.alertRule.findMany).not.toHaveBeenCalled();
    });

    test('should cache rules after fetching from database', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'alert_rules:metric-123',
        JSON.stringify([mockAlertRule]),
        { EX: 300 }
      );
    });

    test('should handle cache miss gracefully', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { metric_id: 'metric-123' }
      });
    });
  });
});