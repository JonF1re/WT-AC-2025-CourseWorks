import { Role } from '../enums/role.enum';

export function parseRole(value: unknown): Role {
  if (value === Role.USER || value === Role.ADMIN) {
    return value;
  }

  throw new Error(`Invalid role in JWT payload: ${String(value)}`);
}
