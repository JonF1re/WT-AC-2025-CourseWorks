import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('User Schema', () => {
    const UserSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      role: z.enum(['admin', 'user', 'service']).optional().default('user'),
    });

    test('should validate correct user data', () => {
      const validUser = {
        username: 'testuser',
        password: 'password123'
      };
      
      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('user');
      }
    });

    test('should validate admin user', () => {
      const adminUser = {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      };
      
      const result = UserSchema.safeParse(adminUser);
      expect(result.success).toBe(true);
    });

    test('should reject empty username', () => {
      const invalidUser = {
        username: '',
        password: 'password123'
      };
      
      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('should reject empty password', () => {
      const invalidUser = {
        username: 'testuser',
        password: ''
      };
      
      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('should reject invalid role', () => {
      const invalidUser = {
        username: 'testuser',
        password: 'password123',
        role: 'invalid'
      };
      
      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Device Schema', () => {
    const DeviceSchema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      location: z.string().optional(),
      owner_id: z.string().uuid(),
      type: z.string().optional(),
    });

    test('should validate correct device data', () => {
      const validDevice = {
        name: 'Smart Thermostat',
        description: 'Living room thermostat',
        location: 'Living Room',
        owner_id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'thermostat'
      };
      
      const result = DeviceSchema.safeParse(validDevice);
      expect(result.success).toBe(true);
    });

    test('should validate device without optional fields', () => {
      const minimalDevice = {
        name: 'Sensor',
        owner_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = DeviceSchema.safeParse(minimalDevice);
      expect(result.success).toBe(true);
    });

    test('should reject empty name', () => {
      const invalidDevice = {
        name: '',
        owner_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = DeviceSchema.safeParse(invalidDevice);
      expect(result.success).toBe(false);
    });

    test('should reject invalid UUID', () => {
      const invalidDevice = {
        name: 'Device',
        owner_id: 'invalid-uuid'
      };
      
      const result = DeviceSchema.safeParse(invalidDevice);
      expect(result.success).toBe(false);
    });
  });

  describe('Metric Schema', () => {
    const MetricSchema = z.object({
      device_id: z.string().uuid(),
      name: z.string().min(1),
      unit: z.string().min(1),
    });

    test('should validate correct metric data', () => {
      const validMetric = {
        device_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Temperature',
        unit: '°C'
      };
      
      const result = MetricSchema.safeParse(validMetric);
      expect(result.success).toBe(true);
    });

    test('should reject empty metric name', () => {
      const invalidMetric = {
        device_id: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
        unit: '°C'
      };
      
      const result = MetricSchema.safeParse(invalidMetric);
      expect(result.success).toBe(false);
    });

    test('should reject empty unit', () => {
      const invalidMetric = {
        device_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Temperature',
        unit: ''
      };
      
      const result = MetricSchema.safeParse(invalidMetric);
      expect(result.success).toBe(false);
    });

    test('should reject invalid device_id format', () => {
      const invalidMetric = {
        device_id: 'invalid',
        name: 'Temperature',
        unit: '°C'
      };
      
      const result = MetricSchema.safeParse(invalidMetric);
      expect(result.success).toBe(false);
    });
  });

  describe('Reading Schema', () => {
    const ReadingSchema = z.object({
      metric_id: z.string().uuid(),
      timestamp: z.string().datetime(),
      value: z.number(),
    });

    test('should validate correct reading data', () => {
      const validReading = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2024-01-01T12:00:00Z',
        value: 25.5
      };
      
      const result = ReadingSchema.safeParse(validReading);
      expect(result.success).toBe(true);
    });

    test('should reject invalid timestamp format', () => {
      const invalidReading = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: 'invalid-date',
        value: 25.5
      };
      
      const result = ReadingSchema.safeParse(invalidReading);
      expect(result.success).toBe(false);
    });

    test('should reject non-numeric value', () => {
      const invalidReading = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2024-01-01T12:00:00Z',
        value: 'not-a-number' as any
      };
      
      const result = ReadingSchema.safeParse(invalidReading);
      expect(result.success).toBe(false);
    });

    test('should accept negative values for metrics', () => {
      const validReading = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2024-01-01T12:00:00Z',
        value: -10.5
      };
      
      const result = ReadingSchema.safeParse(validReading);
      expect(result.success).toBe(true);
    });
  });

  describe('Alert Schema', () => {
    const AlertSchema = z.object({
      metric_id: z.string().uuid(),
      reading_id: z.string().uuid().optional(),
      level: z.enum(['info', 'warning', 'critical']),
      message: z.string().min(1),
      threshold: z.number().optional(),
      status: z.enum(['new', 'acknowledged', 'closed']).optional().default('new'),
    });

    test('should validate correct alert data', () => {
      const validAlert = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        reading_id: '123e4567-e89b-12d3-a456-426614174001',
        level: 'critical',
        message: 'Temperature exceeds threshold',
        threshold: 30,
        status: 'new'
      };
      
      const result = AlertSchema.safeParse(validAlert);
      expect(result.success).toBe(true);
    });

    test('should validate alert without optional fields', () => {
      const minimalAlert = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        level: 'info',
        message: 'Alert message'
      };
      
      const result = AlertSchema.safeParse(minimalAlert);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('new');
      }
    });

    test('should reject empty message', () => {
      const invalidAlert = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        level: 'critical',
        message: ''
      };
      
      const result = AlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });

    test('should reject invalid level', () => {
      const invalidAlert = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        level: 'invalid',
        message: 'Alert message'
      } as any;
      
      const result = AlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });

    test('should reject invalid UUID for reading_id', () => {
      const invalidAlert = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        reading_id: 'invalid',
        level: 'critical',
        message: 'Alert message'
      };
      
      const result = AlertSchema.safeParse(invalidAlert);
      expect(result.success).toBe(false);
    });
  });

  describe('Alert Rule Schema', () => {
    const AlertRuleSchema = z.object({
      metric_id: z.string().uuid(),
      condition: z.string(),
      threshold: z.number(),
      level: z.enum(['info', 'warning', 'critical']),
      message_template: z.string().min(1),
    });

    test('should validate correct alert rule data', () => {
      const validRule = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        condition: '>',
        threshold: 30.5,
        level: 'critical',
        message_template: 'Temperature exceeds {threshold}°C'
      };
      
      const result = AlertRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    test('should reject empty condition', () => {
      const invalidRule = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        condition: '',
        threshold: 30,
        level: 'critical',
        message_template: 'Alert'
      };
      
      const result = AlertRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
    });

    test('should reject empty message template', () => {
      const invalidRule = {
        metric_id: '123e4567-e89b-12d3-a456-426614174000',
        condition: '>',
        threshold: 30,
        level: 'critical',
        message_template: ''
      };
      
      const result = AlertRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
    });

    test('should accept various condition operators', () => {
      const operators = ['>', '<', '>=', '<=', '==', '!='];
      
      operators.forEach(operator => {
        const rule = {
          metric_id: '123e4567-e89b-12d3-a456-426614174000',
          condition: operator,
          threshold: 30,
          level: 'info',
          message_template: 'Template'
        };
        
        const result = AlertRuleSchema.safeParse(rule);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Ticket Schema', () => {
    const TicketSchema = z.object({
      type: z.enum(['add', 'edit', 'delete']),
      object: z.enum(['user', 'device', 'metric']).optional(),
      comment: z.string().optional(),
      device_id: z.string().uuid().optional(),
    });

    test('should validate correct ticket data', () => {
      const validTicket = {
        type: 'add',
        object: 'device',
        comment: 'Need to add new sensor',
        device_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      
      const result = TicketSchema.safeParse(validTicket);
      expect(result.success).toBe(true);
    });

    test('should validate minimal ticket data', () => {
      const minimalTicket = {
        type: 'add'
      };
      
      const result = TicketSchema.safeParse(minimalTicket);
      expect(result.success).toBe(true);
    });

    test('should reject invalid ticket type', () => {
      const invalidTicket = {
        type: 'invalid'
      } as any;
      
      const result = TicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });

    test('should reject invalid object type', () => {
      const invalidTicket = {
        type: 'add',
        object: 'invalid'
      } as any;
      
      const result = TicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });

    test('should reject invalid device_id format', () => {
      const invalidTicket = {
        type: 'add',
        device_id: 'invalid'
      };
      
      const result = TicketSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    const LoginSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });

    test('should validate correct login data', () => {
      const validLogin = {
        username: 'testuser',
        password: 'password123'
      };
      
      const result = LoginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    test('should reject empty username', () => {
      const invalidLogin = {
        username: '',
        password: 'password123'
      };
      
      const result = LoginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });

    test('should reject empty password', () => {
      const invalidLogin = {
        username: 'testuser',
        password: ''
      };
      
      const result = LoginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('Partial Schemas', () => {
    const UserSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      role: z.enum(['admin', 'user', 'service']).optional().default('user'),
    });

    test('should validate partial user update', () => {
      const UserSchemaPartial = UserSchema.partial();
      
      const partialUpdate = {
        username: 'newusername'
      };
      
      const result = UserSchemaPartial.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    test('should reject invalid data in partial update', () => {
      const UserSchemaPartial = UserSchema.partial();
      
      const invalidUpdate = {
        role: 'invalid'
      } as any;
      
      const result = UserSchemaPartial.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    test('should allow empty partial object', () => {
      const UserSchemaPartial = UserSchema.partial();
      
      const emptyUpdate = {};
      
      const result = UserSchemaPartial.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });
});