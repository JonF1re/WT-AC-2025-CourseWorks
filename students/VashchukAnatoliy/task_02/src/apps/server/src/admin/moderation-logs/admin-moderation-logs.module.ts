import { Module } from '@nestjs/common';
import { AdminModerationLogsController } from './admin-moderation-logs.controller';
import { AdminModerationLogsService } from './admin-moderation-logs.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AdminModerationLogsController],
  providers: [AdminModerationLogsService, PrismaService],
})
export class AdminModerationLogsModule {}
