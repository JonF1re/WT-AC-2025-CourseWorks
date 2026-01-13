import { Test, TestingModule } from '@nestjs/testing';
import { RepliesService } from './replies.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RepliesService', () => {
  let service: RepliesService;

  const mockPrismaService = {
    post: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepliesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RepliesService>(RepliesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReply', () => {
    it('should create a reply successfully', async () => {
      const userId = '1';
      const postId = '1';
      const content = 'Test reply';

      mockPrismaService.post.findFirst.mockResolvedValue({
        id: postId,
      });
      mockPrismaService.post.create.mockResolvedValue({
        id: '2',
        text: content,
        authorId: userId,
        replyToPostId: postId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: userId,
          username: 'user1',
          email: 'user1@example.com',
        },
        replyToPost: {
          id: postId,
        },
      });

      const result = await service.createReply(postId, userId, { content });

      expect(result.text).toBe(content);
      expect(result.replyToPostId).toBe(postId);
      expect(mockPrismaService.post.create).toHaveBeenCalledWith({
        data: {
          text: content,
          authorId: userId,
          replyToPostId: postId,
          status: 'active',
        },
        include: {
          author: true,
          replyToPost: true,
        },
      });
    });

    it('should throw error if post does not exist', async () => {
      const userId = '1';
      const postId = '999';
      const content = 'Test reply';

      mockPrismaService.post.findFirst.mockResolvedValue(null);

      await expect(service.createReply(postId, userId, { content })).rejects.toThrow();
    });
  });

  describe('getReplies', () => {
    it('should return paginated replies', async () => {
      const postId = '1';
      const replies = [
        {
          id: '2',
          text: 'Reply 1',
          authorId: '2',
          replyToPostId: postId,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: {
            id: '2',
            username: 'user2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(replies);

      const result = await service.getReplies(postId);

      expect(result.items).toEqual(replies);
      expect(result.nextCursor).toBeNull();
      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith({
        where: {
          replyToPostId: postId,
          deletedAt: null,
          isHidden: false,
          status: 'active',
        },
        include: {
          author: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 21,
      });
    });

    it('should handle pagination with cursor', async () => {
      const postId = '1';
      const cursor = 'cursor-id';
      const replies = [
        {
          id: '2',
          text: 'Reply 1',
          authorId: '2',
          replyToPostId: postId,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: {
            id: '2',
            username: 'user2',
            email: 'user2@example.com',
          },
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(replies);

      const result = await service.getReplies(postId, cursor, 20);

      expect(result.items).toEqual(replies);
      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: cursor },
          skip: 1,
        }),
      );
    });
  });
});
