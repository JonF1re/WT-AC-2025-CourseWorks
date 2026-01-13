import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, requireAdmin, requireService, requireUserOrAdmin, AuthRequest } from '../../../src/auth/auth';

jest.mock('jsonwebtoken');

describe('Authentication Module', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    nextFunction = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    test('should return 401 if no token provided', () => {
      mockRequest.headers = {};
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'No token provided' }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should return 401 if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid_token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'Invalid token' }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should add user to request and call next() with valid token', () => {
      const mockUser = { id: 'user123', role: 'admin' };
      mockRequest.headers = { authorization: 'Bearer valid_token' };
      (jwt.verify as jest.Mock).mockReturnValue(mockUser);
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(jwt.verify).toHaveBeenCalledWith('valid_token', process.env.JWT_SECRET || 'your-secret-key');
      expect(mockRequest.user).toEqual(mockUser);
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    test('should handle malformed authorization header', () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'unauthorized', message: 'No token provided' }
      });
    });
  });

  describe('requireRole middleware factory', () => {
    test('should call next() if user has required role', () => {
      mockRequest.user = { id: 'user123', role: 'admin' };
      
      const middleware = requireRole(['admin', 'user']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    test('should return 403 if user role not in allowed roles', () => {
      mockRequest.user = { id: 'user123', role: 'service' };
      
      const middleware = requireRole(['admin', 'user']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'forbidden', message: 'Insufficient permissions' }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should return 403 if user is not authenticated', () => {
      mockRequest.user = undefined;
      
      const middleware = requireRole(['admin', 'user']);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        error: { code: 'forbidden', message: 'Insufficient permissions' }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should work with empty roles array', () => {
      mockRequest.user = { id: 'user123', role: 'admin' };
      
      const middleware = requireRole([]);
      middleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('pre-defined role middlewares', () => {
    test('requireAdmin should only allow admin role', () => {
      mockRequest.user = { id: 'user123', role: 'admin' };
      
      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      mockRequest.user = { id: 'user123', role: 'user' };
      
      requireAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('requireService should only allow service role', () => {
      mockRequest.user = { id: 'service1', role: 'service' };
      
      requireService(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      mockRequest.user = { id: 'user123', role: 'user' };
      
      requireService(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    test('requireUserOrAdmin should allow both user and admin roles', () => {
      mockRequest.user = { id: 'admin1', role: 'admin' };
      requireUserOrAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      nextFunction.mockClear();
      
      mockRequest.user = { id: 'user1', role: 'user' };
      requireUserOrAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      
      nextFunction.mockClear();
      
      mockRequest.user = { id: 'service1', role: 'service' };
      requireUserOrAdmin(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('JWT secret handling', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
      originalEnv = process.env;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'test-secret-from-env';
      mockRequest.headers = { authorization: 'Bearer token' };
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(jwt.verify).toHaveBeenCalledWith('token', 'test-secret-from-env');
    });

    test('should use default secret if JWT_SECRET not set', () => {
      delete process.env.JWT_SECRET;
      mockRequest.headers = { authorization: 'Bearer token' };
      
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      
      expect(jwt.verify).toHaveBeenCalledWith('token', 'your-secret-key');
    });
  });

  describe('role-based access control according to documentation', () => {
    test('admin should have access to all admin endpoints', () => {
      mockRequest.user = { id: 'admin1', role: 'admin' };
      
      const adminEndpoints = requireRole(['admin']);
      adminEndpoints(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('user should have limited access', () => {
      mockRequest.user = { id: 'user1', role: 'user' };
      
      const userEndpoints = requireRole(['user', 'admin']);
      userEndpoints(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });

    test('service role should only access specific endpoints', () => {
      mockRequest.user = { id: 'service1', role: 'service' };
      
      const serviceEndpoints = requireRole(['service']);
      serviceEndpoints(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});