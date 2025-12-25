import { Role } from '@prisma/client';

export function isAdmin(role: Role) {
  return role === Role.admin;
}
