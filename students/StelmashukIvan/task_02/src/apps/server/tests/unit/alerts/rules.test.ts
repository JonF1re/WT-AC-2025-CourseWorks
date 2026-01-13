import { generateMessage, checkRules } from '../../../src/alerts/alertsEngine';
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

describe('Alerts Engine Rules', () => {
  let mockReading: Reading;
  let mockAlertRule: AlertRule;
  let mockMetric: Metric & { device: Device };
  let mockUser: User;
  let mockIo: any;

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
      message_template: '{metricName} is {value}, exceeding {threshold}'
    } as AlertRule;

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };
  });

  describe('generateMessage', () => {
    test('should replace template variables correctly', () => {
      const template = '{metricName} value {value} exceeds threshold {threshold}';
      const result = generateMessage(template, 'Temperature', 35.5, 30);
      
      expect(result).toBe('Temperature value 35.5 exceeds threshold 30');
    });

    test('should handle multiple occurrences of same variable', () => {
      const template = '{metricName}: {value}, {metricName}: {value}';
      const result = generateMessage(template, 'Temp', 25, 20);
      
      expect(result).toBe('Temp: 25, Temp: 25');
    });

    test('should handle empty template', () => {
      const result = generateMessage('', 'Temp', 25, 20);
      expect(result).toBe('');
    });

    test('should preserve text without variables', () => {
      const template = 'Alert: High temperature detected';
      const result = generateMessage(template, 'Temperature', 35, 30);
      
      expect(result).toBe('Alert: High temperature detected');
    });
  });

  describe('checkRules', () => {
    test('should fetch rules from cache if available', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockRedisClient.get).toHaveBeenCalledWith('alert_rules:metric-123');
      expect(mockPrisma.alertRule.findMany).not.toHaveBeenCalled();
    });

    test('should fetch rules from database if not in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);
      mockRedisClient.set.mockResolvedValue('OK');
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockRedisClient.get).toHaveBeenCalledWith('alert_rules:metric-123');
      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
        where: { metric_id: 'metric-123' }
      });
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'alert_rules:metric-123',
        JSON.stringify([mockAlertRule]),
        { EX: 300 }
      );
    });

    test('should create alert when condition is met with > operator', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'critical',
        status: 'new',
        threshold: 30,
        message: 'Temperature is 35.5, exceeding 30'
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: {
          metric_id: 'metric-123',
          reading_id: 'reading-123',
          level: 'critical',
          status: 'new',
          threshold: 30,
          message: 'Temperature is 35.5, exceeding 30'
        }
      });
    });

    test('should create alert when condition is met with < operator', async () => {
      const lowTempRule: AlertRule = {
        ...mockAlertRule,
        condition: '<',
        threshold: 20,
        level: 'warning',
        message_template: '{metricName} is {value}, below {threshold}'
      };

      const lowTempReading: Reading = {
        ...mockReading,
        value: 15
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([lowTempRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'warning',
        status: 'new',
        threshold: 20,
        message: 'Temperature is 15, below 20'
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(lowTempReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: {
          metric_id: 'metric-123',
          reading_id: 'reading-123',
          level: 'warning',
          status: 'new',
          threshold: 20,
          message: 'Temperature is 15, below 20'
        }
      });
    });

    test('should handle all comparison operators correctly', async () => {
      const operators = ['>', '<', '>=', '<=', '==', '!='];
      
      for (const operator of operators) {
        const rule: AlertRule = {
          ...mockAlertRule,
          condition: operator,
          threshold: 30
        };

        const testReading: Reading = {
          ...mockReading,
          value: operator === '!=' ? 31 : 30
        };

        mockRedisClient.get.mockResolvedValue(JSON.stringify([rule]));
        mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
        mockPrisma.alert.create.mockResolvedValue({} as Alert);

        await checkRules(testReading, mockIo);

        if (operator === '!=') {
          expect(mockPrisma.alert.create).toHaveBeenCalled();
        }
      }
    });

    test('should not create alert when condition is not met', async () => {
      const rule: AlertRule = {
        ...mockAlertRule,
        condition: '>',
        threshold: 40
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([rule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    test('should send socket notification when alert is created and io provided', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      
      const mockAlert = {
        id: 'alert-123',
        metric_id: 'metric-123',
        reading_id: 'reading-123',
        level: 'critical',
        status: 'new',
        threshold: 30,
        message: 'Temperature is 35.5, exceeding 30'
      } as Alert;
      
      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      await checkRules(mockReading, mockIo);

      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
      expect(mockIo.emit).toHaveBeenCalledWith('new_alert', mockAlert);
    });

    test('should not send socket notification when io not provided', async () => {
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

    test('should skip unknown condition operators', async () => {
      const invalidRule: AlertRule = {
        ...mockAlertRule,
        condition: '???',
        threshold: 30
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify([invalidRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    test('should handle metric not found gracefully', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockResolvedValue(null);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    test('should handle redis connection error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error in checkRules for reading ${mockReading.id}:`,
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle prisma error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify([mockAlertRule]));
      mockPrisma.metric.findUnique.mockRejectedValue(new Error('Prisma error'));

      await checkRules(mockReading, mockIo);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Error in checkRules for reading ${mockReading.id}:`,
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('should process multiple rules for same metric', async () => {
      const rules: AlertRule[] = [
        { ...mockAlertRule, id: 'rule-1', condition: '>', threshold: 30, level: 'critical' },
        { ...mockAlertRule, id: 'rule-2', condition: '>', threshold: 25, level: 'warning' },
        { ...mockAlertRule, id: 'rule-3', condition: '<', threshold: 40, level: 'info' }
      ];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(rules));
      mockPrisma.metric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.alert.create.mockResolvedValue({} as Alert);

      await checkRules(mockReading, mockIo);

      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(3);
    });
  });
});