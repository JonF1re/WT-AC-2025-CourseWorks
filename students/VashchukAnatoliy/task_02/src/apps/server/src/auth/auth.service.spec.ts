import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    createUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'USER',
        displayName: 'Test User',
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({ username: 'testuser', password: 'password123' });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.username).toBe('testuser');
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(
        service.login({ username: 'wronguser', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: '1',
        username: 'testuser',
        passwordHash: hashedPassword,
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.login({ username: 'testuser', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create new user and return access token', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue(null);

      const mockCreatedUser = {
        id: '2',
        username: 'newuser',
        email: 'new@example.com',
        role: 'USER',
        password: 'hashed',
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.createUser.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.register(registerDto);

      expect(result.access_token).toBe('new-jwt-token');
      expect(result.user.username).toBe('newuser');
    });

    it('should throw BadRequestException for existing username', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByUsername.mockResolvedValue({
        id: '1',
        username: 'existinguser',
      });

      await expect(
        service.register({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for existing email', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
      });

      await expect(
        service.register({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
