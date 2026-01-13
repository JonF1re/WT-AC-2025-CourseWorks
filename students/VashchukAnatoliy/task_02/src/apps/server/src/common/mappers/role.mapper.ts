import { Role } from '../enums/role.enum';

export function mapRoleToPrisma(role: Role): 'user' | 'admin' {
  switch (role) {
    case Role.ADMIN:
      return 'admin';
    case Role.USER:
    default:
      return 'user';
  }
}

export function mapRoleFromPrisma(role: 'user' | 'admin'): Role {
  switch (role) {
    case 'admin':
      return Role.ADMIN;
    case 'user':
    default:
      return Role.USER;
  }
}
