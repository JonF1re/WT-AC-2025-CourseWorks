import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({
    description: 'Причина жалобы',
    example: 'Содержит оскорбительный контент',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Опишите причину жалобы.' })
  @MaxLength(500, { message: 'Максимальная длина причины — 500 символов.' })
  reason: string;
}
