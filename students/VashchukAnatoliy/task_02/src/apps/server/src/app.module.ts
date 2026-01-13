import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { RepliesModule } from './replies/replies.module';
import { FollowsModule } from './follows/follows.module';
import { PrismaModule } from './prisma/prisma.module';
import { LikesModule } from './likes/likes.module';
import { AdminModule } from './admin/admin.module';
import { AdminModerationLogsModule } from './admin/moderation-logs/admin-moderation-logs.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // 👈 один раз глобально
    AuthModule,
    UsersModule,
    PostsModule,
    RepliesModule,
    FollowsModule,
    LikesModule,
    ReportsModule,
    AdminModule,
    AdminModerationLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
