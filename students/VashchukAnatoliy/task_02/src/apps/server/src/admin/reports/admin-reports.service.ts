import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewReportAction } from './dto/review-report.dto';
import { ReportStatus, PostStatus, ModerationAction } from '../../../generated/prisma';

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpenReports(params?: { cursor?: string; limit?: number }) {
    const limit = Math.min(params?.limit ?? 20, 50);

    const reports = await this.prisma.report.findMany({
      where: { status: ReportStatus.open },
      take: limit + 1,
      ...(params?.cursor && {
        cursor: { id: params.cursor },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        post: { include: { author: true } },
        reporter: true,
      },
    });

    const hasNextPage = reports.length > limit;
    const items = hasNextPage ? reports.slice(0, limit) : reports;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].id : null,
    };
  }

  async reviewReport(reportId: string, action: ReviewReportAction, moderatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        include: { post: true },
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      if (report.status !== ReportStatus.open) {
        throw new BadRequestException('Report already reviewed');
      }

      const post = report.post;

      let moderationAction: ModerationAction;

      switch (action) {
        case ReviewReportAction.HIDE_POST:
          await tx.post.update({
            where: { id: post.id },
            data: { isHidden: true },
          });
          moderationAction = ModerationAction.hide_post;
          break;

        case ReviewReportAction.ARCHIVE_POST:
          await tx.post.update({
            where: { id: post.id },
            data: { status: PostStatus.archived },
          });
          moderationAction = ModerationAction.archive_post;
          break;

        case ReviewReportAction.IGNORE:
          moderationAction = ModerationAction.ignore_report;
          break;

        default:
          throw new BadRequestException('Unknown moderation action');
      }

      await tx.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.reviewed },
      });

      await tx.moderationLog.create({
        data: {
          moderatorId,
          action: moderationAction,
          reportId: report.id,
          postId: post.id,
        },
      });

      return { success: true };
    });
  }
}
