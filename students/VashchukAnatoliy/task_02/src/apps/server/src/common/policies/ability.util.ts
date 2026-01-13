import { Role } from '../enums/role.enum';
import { Action } from '../enums/action.enum';
import { RolePolicy } from './role-policy.map';

export function can(role: Role, action: Action): boolean {
  return RolePolicy[role]?.includes(action) ?? false;
}
