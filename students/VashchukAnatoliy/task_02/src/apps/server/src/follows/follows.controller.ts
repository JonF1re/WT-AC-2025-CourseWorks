import { Controller, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireActions } from '../common/decorators/require-actions.decorator';
import { Action } from '../common/enums/action.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FollowsService } from './follows.service';

@ApiTags('Follows')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  // =====================
  // FOLLOW
  // =====================
  @Post(':userId')
  @RequireActions(Action.FOLLOW)
  @ApiOperation({ summary: 'Подписаться на пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 201, description: 'Подписка создана' })
  @ApiResponse({ status: 400, description: 'Вы уже подписаны' })
  follow(@Param('userId') targetUserId: string, @CurrentUser('id') userId: string) {
    return this.followsService.followUser(userId, targetUserId);
  }

  // =====================
  // UNFOLLOW
  // =====================
  @Delete(':userId')
  @RequireActions(Action.UNFOLLOW)
  @ApiOperation({ summary: 'Отписаться от пользователя' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Отписка выполнена' })
  @ApiResponse({ status: 400, description: 'Вы не подписаны' })
  unfollow(@Param('userId') targetUserId: string, @CurrentUser('id') userId: string) {
    return this.followsService.unfollowUser(userId, targetUserId);
  }
}
