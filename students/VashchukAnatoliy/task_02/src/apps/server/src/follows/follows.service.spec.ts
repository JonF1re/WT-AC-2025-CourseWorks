import { Test, TestingModule } from '@nestjs/testing';
import { FollowsService } from './follows.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FollowsService', () => {
  let service: FollowsService;

  const mockPrismaService = {
    follow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('followUser', () => {
    it('should follow a user successfully', async () => {
      const followerId = '1';
      const targetId = '2';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: targetId });
      mockPrismaService.follow.findUnique.mockResolvedValue(null);
      mockPrismaService.follow.create.mockResolvedValue({
        id: '1',
        followerId,
        targetId,
        createdAt: new Date(),
      });

      const result = await service.followUser(followerId, targetId);

      expect(result).toEqual({
        id: '1',
        followerId,
        targetId,
        createdAt: expect.any(Date) as Date,
      });
    });

    it('should throw error when trying to follow self', async () => {
      const userId = '1';

      await expect(service.followUser(userId, userId)).rejects.toThrow();
    });

    it('should throw error if user does not exist', async () => {
      const followerId = '1';
      const targetId = '999';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.followUser(followerId, targetId)).rejects.toThrow();
    });

    it('should throw error if already following', async () => {
      const followerId = '1';
      const targetId = '2';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: targetId });
      mockPrismaService.follow.findUnique.mockResolvedValue({
        id: '1',
        followerId,
        targetId,
      });

      await expect(service.followUser(followerId, targetId)).rejects.toThrow();
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user successfully', async () => {
      const followerId = '1';
      const targetId = '2';

      mockPrismaService.follow.findUnique.mockResolvedValue({
        id: '1',
        followerId,
        targetId,
      });
      mockPrismaService.follow.delete.mockResolvedValue({
        id: '1',
        followerId,
        targetId,
      });

      await service.unfollowUser(followerId, targetId);

      expect(mockPrismaService.follow.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw error if not following', async () => {
      const followerId = '1';
      const targetId = '2';

      mockPrismaService.follow.findUnique.mockResolvedValue(null);

      await expect(service.unfollowUser(followerId, targetId)).rejects.toThrow();
    });
  });
});
