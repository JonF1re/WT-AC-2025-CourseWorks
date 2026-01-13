// replies/dto/create-reply.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
