import { ForbiddenException } from '@nestjs/common';
import type { Post } from '../../../generated/prisma';
import { Role } from '../../common/enums/role.enum';

export class PostOwnershipPolicy {
  static canModifyPost(user: { id: string; role: Role }, post: Post): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (post.authorId === user.id) {
      return;
    }

    throw new ForbiddenException('You are not allowed to modify this post');
  }
}
