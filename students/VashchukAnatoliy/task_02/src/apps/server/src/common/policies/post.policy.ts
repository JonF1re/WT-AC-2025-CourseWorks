import { Role } from '../enums/role.enum';

type UserLike = {
  id: string;
  role: Role;
};

type PostLike = {
  authorId: string;
};

export function canDeletePost(user: UserLike, post: PostLike): boolean {
  // ADMIN может всё
  if (user.role === Role.ADMIN) {
    return true;
  }

  // USER — только свои
  return user.role === Role.USER && post.authorId === user.id;
}

export function canEditPost(user: UserLike, post: PostLike): boolean {
  // редактировать — только свои, даже для ADMIN
  return user.role === Role.USER && post.authorId === user.id;
}
