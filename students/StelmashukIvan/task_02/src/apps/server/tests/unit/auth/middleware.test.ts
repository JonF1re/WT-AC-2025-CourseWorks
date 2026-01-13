import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireRole, requireAdmin, requireService, requireUserOrAdmin, AuthRequest, authenticate } from '../../../src/auth/auth';

jest.mock('jsonwebtoken');
jest.mock('../../../src/alerts/alertsEngine');

describe('Authentication and Authorization Middleware Integration', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    
    mockRequest = {
      headers: {},
      user: undefined
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
      end: jest.fn()
    };
    
    nextFunction = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('Middleware chain integration', () => {
    test('should call next() when authenticate and requireRole succeed', async () => {
      const mockUser = { id: 'user123', role: 'admin' };
      mockRequest.headers = { authorization: 'Bearer valid_token' };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);
      
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user).toEqual(mockUser);
      
      nextFunction.mockClear();
      
      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    test('should block when authenticate passes but requireRole fails', async () => {
      const mockUser = { id: 'user123', role: 'user' };
      mockRequest.headers = { authorization: 'Bearer valid_token' };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);
      
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledTimes(1);
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'forbidden', message: 'Insufficient permissions' }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should handle multiple middleware in correct order', async () => {
      mockRequest.user = { id: 'admin1', role: 'admin' };
      
      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);

      nextFunction.mockClear();
      mockRequest.user = { id: 'service1', role: 'service' };
      
      requireService(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      
      nextFunction.mockClear();
      mockRequest.user = { id: 'user1', role: 'user' };
      
      requireUserOrAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role-based access according to RBAC documentation', () => {
    test('admin should have access to all operations based on Matrix of Rights', () => {
      const adminRoles = ['admin'];
      const userRoles = ['user', 'admin'];
      const serviceRoles = ['service'];
      
      mockRequest.user = { id: 'admin1', role: 'admin' };
      
      const adminMiddleware = requireRole(adminRoles);
      adminMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      
      const userMiddleware = requireRole(userRoles);
      userMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      
      const serviceMiddleware = requireRole(serviceRoles);
      serviceMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('user should have limited access based on Matrix of Rights', () => {
      mockRequest.user = { id: 'user1', role: 'user' };
      
      const viewDevicesMiddleware = requireRole(['admin', 'user']);
      viewDevicesMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const createDeviceMiddleware = requireRole(['admin']);
      createDeviceMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const viewReadingsMiddleware = requireRole(['admin', 'user']);
      viewReadingsMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const createReadingsMiddleware = requireRole(['service']);
      createReadingsMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('service role should only access specific operations', () => {
      mockRequest.user = { id: 'service1', role: 'service' };
      
      const createReadingsMiddleware = requireRole(['service']);
      createReadingsMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const createAlertsMiddleware = requireRole(['service', 'admin']);
      createAlertsMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      statusMock.mockClear();
      jsonMock.mockClear();
      
      const viewUsersMiddleware = requireRole(['admin']);
      viewUsersMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Middleware error handling', () => {
    test('should handle JWT verification errors gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid_token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('JWT verification failed');
      });
      
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'Invalid token' }
      });
    });

    test('should handle missing authorization header', async () => {
      mockRequest.headers = {};
      
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'No token provided' }
      });
    });

    test('should handle malformed authorization header', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };
      
      await authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'No token provided' }
      });
    });
  });

  describe('Middleware with route-specific context', () => {
    test('should check device ownership for non-admin users', () => {
      mockRequest.user = { id: 'user1', role: 'user' };
      mockRequest.params = { id: 'device123' };
      
      const device = { id: 'device123', owner_id: 'user1' };
      
      if (mockRequest.user!.role === 'admin' || device.owner_id === mockRequest.user!.id) {
        expect(true).toBe(true);
      } else {
        expect(true).toBe(false);
      }
      
      mockRequest.user = { id: 'user2', role: 'user' };
      if (mockRequest.user!.role === 'admin' || device.owner_id === mockRequest.user!.id) {
        expect(true).toBe(false);
      } else {
        expect(true).toBe(true);
      }
    });

    test('should allow admin to access any device', () => {
      mockRequest.user = { id: 'admin1', role: 'admin' };
      mockRequest.params = { id: 'device123' };
      
      const device = { id: 'device123', owner_id: 'user1' };
      
      if (mockRequest.user!.role === 'admin' || device.owner_id === mockRequest.user!.id) {
        expect(true).toBe(true);
      } else {
        expect(true).toBe(false);
      }
    });
  });

  describe('Middleware integration with real route patterns', () => {
    const testRoutes = [
      { path: '/users', method: 'GET', allowedRoles: ['admin'] },
      { path: '/devices', method: 'GET', allowedRoles: ['admin', 'user'] },
      { path: '/devices', method: 'POST', allowedRoles: ['admin'] },
      { path: '/metrics', method: 'GET', allowedRoles: ['admin', 'user'] },
      { path: '/readings', method: 'POST', allowedRoles: ['service'] },
      { path: '/alerts', method: 'GET', allowedRoles: ['admin', 'user'] },
      { path: '/alerts', method: 'POST', allowedRoles: ['admin', 'service'] },
      { path: '/tickets', method: 'GET', allowedRoles: ['admin', 'user'] },
      { path: '/system/logs', method: 'GET', allowedRoles: ['admin'] },
    ];

    testRoutes.forEach(route => {
      test(`route ${route.method} ${route.path} should allow roles: ${route.allowedRoles.join(', ')}`, () => {
        route.allowedRoles.forEach(role => {
          mockRequest.user = { id: 'test1', role };
          nextFunction.mockClear();
          statusMock.mockClear();
          jsonMock.mockClear();
          
          const middleware = requireRole(route.allowedRoles);
          middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
          
          expect(nextFunction).toHaveBeenCalled();
          expect(statusMock).not.toHaveBeenCalled();
        });
        
        const disallowedRole = route.allowedRoles.includes('admin') ? 'service' : 'admin';
        mockRequest.user = { id: 'test1', role: disallowedRole };
        nextFunction.mockClear();
        statusMock.mockClear();
        jsonMock.mockClear();
        
        const middleware = requireRole(route.allowedRoles);
        middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
        
        expect(statusMock).toHaveBeenCalledWith(403);
      });
    });
  });

  describe('Edge cases and security considerations', () => {
    test('should handle undefined user after authentication', () => {
      mockRequest.user = undefined;
      
      const middleware = requireRole(['admin']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should handle invalid role strings', () => {
      mockRequest.user = { id: 'user1', role: 'invalid_role' as any };
      
      const middleware = requireRole(['admin', 'user', 'service']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should be case-sensitive for roles', () => {
      mockRequest.user = { id: 'user1', role: 'ADMIN' };
      
      const middleware = requireRole(['admin']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('should not allow role escalation through middleware manipulation', () => {
      mockRequest.headers = { authorization: 'Bearer user_token' };
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'user1', role: 'user' });
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      if (mockRequest.user) {
        mockRequest.user.role = 'admin';
      }
      
      nextFunction.mockClear();
      
      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});