import { Module } from '@nestjs/common';

import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminModule {}
