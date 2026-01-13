import { IsUUID } from 'class-validator';

export class LikePostParams {
  @IsUUID()
  postId: string;
}
