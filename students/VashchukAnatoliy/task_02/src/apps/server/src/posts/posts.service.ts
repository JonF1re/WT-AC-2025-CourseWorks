import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { Post, Prisma } from '../../generated/prisma';

import { PostOwnershipPolicy } from '../common/policies/post-ownership.policy';
import { EditPostDto } from './dto/edit-post.dto';

import { Role } from '../common/enums/role.enum';
import { PostStatus } from '../../generated/prisma';

type PostWithAuthorAndCounts = Prisma.PostGetPayload<{
  include: {
    author: true;
    _count: {
      select: {
        likes: true;
        replies: true;
      };
    };
  };
}>;

type PostWithLikes = PostWithAuthorAndCounts & {
  likes?: Array<{ id: string }>;
};

type PostResponse = Omit<PostWithLikes, 'likes'> & {
  isLikedByMe?: boolean;
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(authorId: string, text: string): Promise<Post> {
    return this.prisma.post.create({
      data: {
        text,
        authorId,
        status: 'active',
      },
    });
  }

  async getPostById(id: string, userId?: string): Promise<PostResponse | PostWithAuthorAndCounts> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    if (userId && post.likes) {
      const { likes, ...rest } = post;
      return {
        ...rest,
        isLikedByMe: likes.length > 0,
      };
    }

    return post;
  }

  async deletePost(user: { id: string; role: any }, postId: string): Promise<void> {
    const post = await this.getPostById(postId);

    // 🔐 ownership check — НЕ ТРОГАЕМ
    PostOwnershipPolicy.canModifyPost(user, post);

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        status: 'archived',
      },
    });
  }

  async getFeed(userId: string, cursor?: string, limit = 20) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { targetId: true },
    });

    const authorIds = [userId, ...follows.map((f) => f.targetId)];

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        replyToPostId: null,
        deletedAt: null,
        isHidden: false,
        status: 'active',
      },
      include: {
        author: true,
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    let nextCursor: string | null = null;

    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    const items = posts.map((post) => ({
      ...post,
      isLikedByMe: post.likes.length > 0,
      likes: undefined,
    }));

    return {
      items,
      nextCursor,
    };
  }

  async getExplore(userId: string, cursor?: string, limit = 20) {
    const posts = await this.prisma.post.findMany({
      where: {
        replyToPostId: null,
        deletedAt: null,
        isHidden: false,
        status: 'active',
      },
      include: {
        author: true,
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    let nextCursor: string | null = null;

    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    const items = posts.map((post) => ({
      ...post,
      isLikedByMe: post.likes.length > 0,
      likes: undefined,
    }));

    return {
      items,
      nextCursor,
    };
  }

  async editPost(postId: string, userId: string, userRole: Role, dto: EditPostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === PostStatus.archived) {
      throw new BadRequestException('Archived post cannot be edited');
    }

    const isAuthor = post.authorId === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You cannot edit this post');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        text: dto.text,
      },
    });
  }
}
