import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminModerationLogsService } from './admin-moderation-logs.service';
import { GetModerationLogsDto } from './dto/get-moderation-logs.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireActions } from '../../common/decorators/require-actions.decorator';
import { Action } from '../../common/enums/action.enum';

@ApiTags('Admin - Moderation Logs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequireActions(Action.VIEW_MODERATION_LOGS)
@Controller('admin/moderation-logs')
export class AdminModerationLogsController {
  constructor(private readonly moderationLogsService: AdminModerationLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить логи модерации (только admin)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей', type: Number })
  @ApiResponse({ status: 200, description: 'Список логов модерации' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  getLogs(@Query() query: GetModerationLogsDto) {
    return this.moderationLogsService.getLogs(query);
  }
}
