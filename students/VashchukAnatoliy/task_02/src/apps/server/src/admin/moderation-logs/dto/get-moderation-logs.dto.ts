import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ModerationAction } from '../../../../generated/prisma';

export class GetModerationLogsDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  moderatorId?: string;

  @IsOptional()
  @IsEnum(ModerationAction)
  action?: ModerationAction;

  @IsOptional()
  @IsString()
  reportId?: string;
}
