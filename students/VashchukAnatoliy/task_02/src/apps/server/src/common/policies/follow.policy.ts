import { BadRequestException } from '@nestjs/common';

export class FollowPolicy {
  static canFollow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException('You cannot follow yourself');
    }
  }

  static canUnfollow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }
  }
}
