import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetModerationLogsDto } from './dto/get-moderation-logs.dto';

@Injectable()
export class AdminModerationLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(dto: GetModerationLogsDto) {
    const limit = Math.min(dto.limit ?? 20, 50);

    const logs = await this.prisma.moderationLog.findMany({
      where: {
        moderatorId: dto.moderatorId,
        action: dto.action,
        reportId: dto.reportId,
      },
      take: limit + 1,
      ...(dto.cursor && {
        cursor: { id: dto.cursor },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        moderator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            text: true,
          },
        },
        report: {
          select: {
            id: true,
            reason: true,
          },
        },
      },
    });

    const hasNextPage = logs.length > limit;
    const items = hasNextPage ? logs.slice(0, limit) : logs;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
    };
  }
}
