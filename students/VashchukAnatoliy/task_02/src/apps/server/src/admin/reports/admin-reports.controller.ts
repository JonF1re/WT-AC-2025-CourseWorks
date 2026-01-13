import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireActions } from '../../common/decorators/require-actions.decorator';
import { Action } from '../../common/enums/action.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminReportsService } from './admin-reports.service';
import { ReviewReportDto } from './dto/review-report.dto';

@ApiTags('Admin - Reports')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get('reports')
  @RequireActions(Action.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Получить список жалоб (только admin)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей' })
  @ApiResponse({ status: 200, description: 'Список жалоб' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  getReports(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.service.getOpenReports({
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('reports/:id/review')
  @RequireActions(Action.REVIEW_REPORTS)
  @ApiOperation({ summary: 'Модерировать жалобу (только admin)' })
  @ApiParam({ name: 'id', description: 'ID жалобы' })
  @ApiResponse({ status: 200, description: 'Жалоба обработана' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Жалоба не найдена' })
  reviewReport(
    @Param('id') reportId: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser('id') moderatorId: string,
  ) {
    return this.service.reviewReport(reportId, dto.action, moderatorId);
  }
}
