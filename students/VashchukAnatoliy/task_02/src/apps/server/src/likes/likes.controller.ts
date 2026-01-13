import { Controller, Post, Delete, Param, UseGuards, HttpCode, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { LikesService } from './likes.service';
import { LikePostParams } from './dto/like-post.params';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireActions } from '../common/decorators/require-actions.decorator';
import { Action } from '../common/enums/action.enum';
import type { AuthRequest } from '../common/types/auth-request.type';

@ApiTags('Likes')
@ApiBearerAuth('access-token')
@Controller('likes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId')
  @RequireActions(Action.LIKE)
  @ApiOperation({ summary: 'Лайкнуть пост' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiResponse({ status: 201, description: 'Лайк добавлен' })
  @ApiResponse({ status: 400, description: 'Вы уже лайкнули этот пост' })
  likePost(@Param() params: LikePostParams, @Req() req: AuthRequest) {
    return this.likesService.likePost(req.user.id, params.postId);
  }

  @Delete(':postId')
  @RequireActions(Action.UNLIKE)
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить лайк' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiResponse({ status: 204, description: 'Лайк удален' })
  @ApiResponse({ status: 404, description: 'Лайк не найден' })
  async unlikePost(@Param() params: LikePostParams, @Req() req: AuthRequest) {
    await this.likesService.unlikePost(req.user.id, params.postId);
  }
}
