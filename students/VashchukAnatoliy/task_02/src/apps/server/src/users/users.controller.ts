import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { FollowersQueryDto } from './dto/followers-query.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/followers')
  @ApiOperation({ summary: 'Получить подписчиков пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список подписчиков' })
  getFollowers(@Param('id') userId: string, @Query() query: FollowersQueryDto) {
    return this.usersService.getFollowers(userId, query.cursor, query.limit);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'Получить подписки пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Список подписок' })
  getFollowing(@Param('id') userId: string, @Query() query: FollowersQueryDto) {
    return this.usersService.getFollowing(userId, query.cursor, query.limit);
  }
}
