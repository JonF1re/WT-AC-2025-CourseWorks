import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '../../generated/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  // =====================
  // PROFILE WITH COUNTS
  // =====================

  async getUserProfile(viewerId: string, profileUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: profileUserId },
      include: {
        followers: {
          where: {
            followerId: viewerId,
          },
          select: { id: true },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const postsCount = await this.prisma.post.count({
      where: {
        authorId: profileUserId,
        replyToPostId: null,
        deletedAt: null,
        status: 'active',
        isHidden: false,
      },
    });

    const { followers, _count, ...rest } = user;

    return {
      ...rest,
      followersCount: _count.followers,
      followingCount: _count.following,
      postsCount,
      isFollowedByMe: followers.length > 0,
    };
  }

  async getFollowers(userId: string, cursor?: string, limit = 20) {
    const followers = await this.prisma.follow.findMany({
      where: { targetId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        follower: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;

    if (followers.length > limit) {
      const next = followers.pop();
      nextCursor = next!.id;
    }

    return {
      items: followers.map((f) => f.follower),
      nextCursor,
    };
  }

  async getFollowing(userId: string, cursor?: string, limit = 20) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        target: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;

    if (following.length > limit) {
      const next = following.pop();
      nextCursor = next!.id;
    }

    return {
      items: following.map((f) => f.target),
      nextCursor,
    };
  }
}
