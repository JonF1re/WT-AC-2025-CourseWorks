// posts/dto/edit-post.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';

export class EditPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}
