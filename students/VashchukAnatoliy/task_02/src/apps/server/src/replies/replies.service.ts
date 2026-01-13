// replies/replies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReplyDto } from './dto/create-reply.dto';
import { Prisma } from '../../generated/prisma';

type ReplyWithAuthor = Prisma.PostGetPayload<{
  include: {
    author: true;
    replyToPost: true;
  };
}>;

@Injectable()
export class RepliesService {
  constructor(private readonly prisma: PrismaService) {}

  async createReply(postId: string, userId: string, dto: CreateReplyDto): Promise<ReplyWithAuthor> {
    const parentPost = await this.prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        isHidden: false,
        status: 'active',
        replyToPostId: null,
      },
      select: { id: true },
    });

    if (!parentPost) {
      throw new NotFoundException('Пост не найден');
    }

    return this.prisma.post.create({
      data: {
        text: dto.content,
        authorId: userId,
        replyToPostId: postId,
        status: 'active',
      },
      include: {
        author: true,
        replyToPost: true,
      },
    });
  }

  async getReplies(postId: string, cursor?: string, limit = 20) {
    const replies = await this.prisma.post.findMany({
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
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    let nextCursor: string | null = null;

    if (replies.length > limit) {
      const next = replies.pop();
      nextCursor = next!.id;
    }

    return {
      items: replies,
      nextCursor,
    };
  }
}
