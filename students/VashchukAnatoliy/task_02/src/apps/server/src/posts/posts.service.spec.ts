import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostOwnershipPolicy } from '../common/policies/post-ownership.policy';
import { Role } from '../common/enums/role.enum';

describe('PostsService', () => {
  let service: PostsService;

  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
    like: {
      findFirst: jest.fn(),
    },
  };

  const mockPostOwnershipPolicy = {
    canEdit: jest.fn(),
    canDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PostOwnershipPolicy, useValue: mockPostOwnershipPolicy },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a new post', async () => {
      const userId = 'user-1';
      const text = 'Test post content';
      const mockPost = {
        id: 'post-1',
        authorId: userId,
        text,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost(userId, text);

      expect(result).toEqual(mockPost);
      expect(mockPrismaService.post.create).toHaveBeenCalledWith({
        data: {
          authorId: userId,
          text,
          status: 'active',
        },
      });
    });
  });

  describe('getPostById', () => {
    it('should return post with author and counts', async () => {
      const postId = 'post-1';
      const userId = 'user-1';
      const mockPost = {
        id: postId,
        text: 'Test post',
        authorId: 'author-1',
        author: {
          id: 'author-1',
          username: 'author',
          displayName: 'Author',
          avatarUrl: null,
        },
        _count: {
          likes: 5,
          replies: 3,
        },
        likes: [],
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      const result = await service.getPostById(postId, userId);

      expect(result).toBeDefined();
      expect(result.author).toBeDefined();
      expect(result._count.likes).toBe(5);
      expect(result._count.replies).toBe(3);
      expect(mockPrismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
        include: {
          author: true,
          likes: { where: { userId }, select: { id: true } },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getPostById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePost', () => {
    it('should soft delete post when user is owner', async () => {
      const postId = 'post-1';
      const user = { id: 'user-1', role: Role.USER };
      const mockPost = {
        id: postId,
        authorId: 'user-1',
        deletedAt: null,
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({ ...mockPost, deletedAt: new Date() });

      await service.deletePost(user, postId);

      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: {
          deletedAt: expect.any(Date) as Date,
          status: 'archived',
        },
      });
    });

    it('should allow admin to soft delete any post', async () => {
      const postId = 'post-1';
      const adminUser = { id: 'admin-1', role: Role.ADMIN };
      const mockPost = {
        id: postId,
        authorId: 'user-1',
        deletedAt: null,
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({ ...mockPost, deletedAt: new Date() });

      await service.deletePost(adminUser, postId);

      expect(mockPrismaService.post.update).toHaveBeenCalled();
    });
  });

  describe('getFeed', () => {
    it('should return paginated feed', async () => {
      const userId = 'user-1';
      const limit = 10;

      mockPrismaService.follow.findMany.mockResolvedValue([
        { targetId: 'user-2' },
        { targetId: 'user-3' },
      ]);

      const mockPosts = [
        {
          id: 'post-1',
          text: 'Post 1',
          authorId: userId,
          author: { id: userId, username: 'user1', displayName: 'User 1' },
          _count: { likes: 2, replies: 1 },
          likes: [],
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getFeed(userId, undefined, limit);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(mockPrismaService.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: userId },
        select: { targetId: true },
      });
    });
  });
});
