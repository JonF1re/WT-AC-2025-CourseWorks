import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post as HttpPost,
  Req,
  UseGuards,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireActions } from '../common/decorators/require-actions.decorator';
import { Action } from '../common/enums/action.enum';
import type { AuthRequest } from '../common/types/auth-request.type';
import { FeedQueryDto } from './dto/feed-query.dto';

@ApiTags('Posts')
@ApiBearerAuth('access-token')
@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  @RequireActions(Action.CREATE_POST)
  @ApiOperation({ summary: 'Создать новый пост' })
  @ApiResponse({ status: 201, description: 'Пост создан' })
  @ApiResponse({ status: 400, description: 'Ошибка валидации' })
  createPost(@Req() req: AuthRequest, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(req.user.id, dto.text);
  }

  @Get(':id')
  @RequireActions(Action.VIEW_POST)
  @ApiOperation({ summary: 'Получить пост по ID' })
  @ApiParam({ name: 'id', description: 'ID поста' })
  @ApiResponse({ status: 200, description: 'Пост найден' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  getPost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.getPostById(id, req.user.id);
  }

  @Delete(':id')
  @RequireActions(Action.DELETE_POST)
  @ApiOperation({ summary: 'Удалить пост' })
  @ApiParam({ name: 'id', description: 'ID поста' })
  @ApiResponse({ status: 200, description: 'Пост удален' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  async deletePost(@Req() req: AuthRequest, @Param('id') id: string) {
    await this.postsService.deletePost(req.user, id);
    return { success: true };
  }

  @Get()
  @RequireActions(Action.VIEW_FEED)
  @ApiOperation({ summary: 'Получить персональную ленту' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество постов' })
  @ApiResponse({ status: 200, description: 'Лента постов' })
  getFeed(@Req() req: AuthRequest, @Query() query: FeedQueryDto) {
    return this.postsService.getFeed(req.user.id, query.cursor, query.limit);
  }

  @Get('explore/all')
  @RequireActions(Action.VIEW_EXPLORE)
  @ApiOperation({ summary: 'Получить публичную ленту всех постов' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Курсор для пагинации' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество постов' })
  @ApiResponse({ status: 200, description: 'Публичная лента' })
  getExplore(@Req() req: AuthRequest, @Query() query: FeedQueryDto) {
    return this.postsService.getExplore(req.user.id, query.cursor, query.limit);
  }

  @Patch(':id')
  @RequireActions(Action.EDIT_POST)
  @ApiOperation({ summary: 'Редактировать пост' })
  @ApiParam({ name: 'id', description: 'ID поста' })
  @ApiResponse({ status: 200, description: 'Пост обновлен' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  @ApiResponse({ status: 404, description: 'Пост не найден' })
  editPost(@Param('id') id: string, @Body() dto: EditPostDto, @Req() req: AuthRequest) {
    return this.postsService.editPost(id, req.user.id, req.user.role, dto);
  }
}
