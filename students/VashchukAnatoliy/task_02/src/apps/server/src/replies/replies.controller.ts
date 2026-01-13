// replies/replies.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { RepliesService } from './replies.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReplyDto } from './dto/create-reply.dto';
import { RepliesQueryDto } from './dto/replies-query.dto';

@ApiTags('Replies')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('posts/:postId/replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать ответ на пост' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiResponse({ status: 201, description: 'Ответ создан' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  createReply(
    @Param('postId') postId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.repliesService.createReply(postId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить ответы на пост' })
  @ApiParam({ name: 'postId', description: 'ID поста' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество ответов' })
  @ApiResponse({ status: 200, description: 'Список ответов' })
  getReplies(@Param('postId') postId: string, @Query() query: RepliesQueryDto) {
    return this.repliesService.getReplies(postId, query.cursor, query.limit);
  }
}
