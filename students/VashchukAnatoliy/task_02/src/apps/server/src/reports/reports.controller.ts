import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireActions } from '../common/decorators/require-actions.decorator';
import { Action } from '../common/enums/action.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('posts/:postId')
  @RequireActions(Action.CREATE_REPORT)
  @ApiOperation({ summary: 'Создать жалобу на пост' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiResponse({ status: 201, description: 'Жалоба успешно создана' })
  @ApiResponse({ status: 400, description: 'Вы уже подали жалобу на этот пост' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  createReport(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.createReport(userId, postId, dto);
  }

  @Get('my')
  @RequireActions(Action.CREATE_REPORT)
  @ApiOperation({ summary: 'Получить мои жалобы' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей', type: Number })
  @ApiResponse({ status: 200, description: 'Список моих жалоб' })
  getMyReports(
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getMyReports(userId, cursor, limit ? Number(limit) : undefined);
  }
}
