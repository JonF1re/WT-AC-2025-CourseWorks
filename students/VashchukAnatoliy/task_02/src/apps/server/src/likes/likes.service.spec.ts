import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from './likes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LikesService', () => {
  let service: LikesService;

  const mockPrismaService = {
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('likePost', () => {
    it('should like a post successfully', async () => {
      const userId = '1';
      const postId = '1';

      mockPrismaService.like.findUnique.mockResolvedValue(null);
      mockPrismaService.post.findUnique.mockResolvedValue({
        id: postId,
        status: 'active',
        isHidden: false,
        deletedAt: null,
      });
      mockPrismaService.like.create.mockResolvedValue({
        id: 1,
        userId,
        postId,
        createdAt: new Date(),
      });

      const result = await service.likePost(userId, postId);

      expect(result).toEqual({
        id: 1,
        userId,
        postId,
        createdAt: expect.any(Date) as Date,
      });
      expect(mockPrismaService.like.create).toHaveBeenCalledWith({
        data: { userId, postId },
      });
    });

    it('should throw error if post does not exist', async () => {
      const userId = '1';
      const postId = '999';

      mockPrismaService.like.findUnique.mockResolvedValue(null);
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.likePost(userId, postId)).rejects.toThrow();
    });

    it('should throw error if already liked', async () => {
      const userId = '1';
      const postId = '1';

      mockPrismaService.post.findUnique.mockResolvedValue({
        id: postId,
        status: 'active',
        isHidden: false,
        deletedAt: null,
      });
      mockPrismaService.like.create.mockRejectedValue(new Error());

      await expect(service.likePost(userId, postId)).rejects.toThrow();
    });
  });

  describe('unlikePost', () => {
    it('should unlike a post successfully', async () => {
      const userId = '1';
      const postId = '1';

      mockPrismaService.like.findUnique.mockResolvedValue({
        id: 1,
        userId,
        postId,
      });
      mockPrismaService.like.delete.mockResolvedValue({
        id: 1,
        userId,
        postId,
      });

      await service.unlikePost(userId, postId);

      expect(mockPrismaService.like.findUnique).toHaveBeenCalledWith({
        where: { userId_postId: { userId, postId } },
      });
      expect(mockPrismaService.like.delete).toHaveBeenCalledWith({
        where: { userId_postId: { userId, postId } },
      });
    });

    it('should throw error if like does not exist', async () => {
      const userId = '1';
      const postId = '1';

      mockPrismaService.like.findUnique.mockResolvedValue(null);

      await expect(service.unlikePost(userId, postId)).rejects.toThrow();
    });
  });
});
