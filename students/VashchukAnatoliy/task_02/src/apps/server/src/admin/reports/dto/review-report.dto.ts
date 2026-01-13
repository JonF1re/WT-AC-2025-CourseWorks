import { IsEnum } from 'class-validator';

export enum ReviewReportAction {
  HIDE_POST = 'hide_post',
  ARCHIVE_POST = 'archive_post',
  IGNORE = 'ignore',
}

export class ReviewReportDto {
  @IsEnum(ReviewReportAction, {
    message: `action must be one of: ${Object.values(ReviewReportAction).join(', ')}`,
  })
  action: ReviewReportAction;
}
