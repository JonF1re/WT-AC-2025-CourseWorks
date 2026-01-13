// src/follows/follows.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // FOLLOW
  // =====================
  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Нельзя подписаться на себя');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Пользователь не найден');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_targetId: {
          followerId: currentUserId,
          targetId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException('Вы уже подписаны на этого пользователя');
    }

    return this.prisma.follow.create({
      data: {
        followerId: currentUserId,
        targetId: targetUserId,
      },
    });
  }

  // =====================
  // UNFOLLOW
  // =====================
  async unfollowUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Нельзя отписаться от себя');
    }

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_targetId: {
          followerId: currentUserId,
          targetId: targetUserId,
        },
      },
    });

    if (!follow) {
      throw new BadRequestException('Вы не подписаны на этого пользователя');
    }

    await this.prisma.follow.delete({
      where: { id: follow.id },
    });
  }
}
