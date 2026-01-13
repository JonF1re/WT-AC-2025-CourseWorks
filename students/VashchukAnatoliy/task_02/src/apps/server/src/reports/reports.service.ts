import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, postId: string, dto: CreateReportDto) {
    // Проверяем существование поста
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Пост не найден.');
    }

    // Проверяем, не подавал ли пользователь уже жалобу на этот пост
    const existingReport = await this.prisma.report.findFirst({
      where: {
        postId,
        reportedBy: userId,
      },
    });

    if (existingReport) {
      throw new BadRequestException('Вы уже подали жалобу на этот пост.');
    }

    // Создаём жалобу
    return this.prisma.report.create({
      data: {
        postId,
        reportedBy: userId,
        reason: dto.reason,
        status: 'open',
      },
      include: {
        post: {
          select: {
            id: true,
            text: true,
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });
  }

  async getMyReports(userId: string, cursor?: string, limit = 20) {
    const reports = await this.prisma.report.findMany({
      where: { reportedBy: userId },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        post: {
          select: {
            id: true,
            text: true,
            author: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    const hasNextPage = reports.length > limit;
    const items = hasNextPage ? reports.slice(0, limit) : reports;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
    };
  }
}
