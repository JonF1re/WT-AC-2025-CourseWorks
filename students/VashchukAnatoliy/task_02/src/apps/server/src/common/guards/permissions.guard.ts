import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Action } from '../enums/action.enum';
import { RolePolicy } from '../policies/role-policy.map';
import { AuthRequest } from '../types/auth-request.type';
import { REQUIRE_ACTIONS_KEY } from '../decorators/require-actions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1️⃣ какие permissions требуются
    const requiredActions = this.reflector.getAllAndOverride<Action[]>(REQUIRE_ACTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredActions || requiredActions.length === 0) {
      return true;
    }

    // 2️⃣ кто делает запрос
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    // 3️⃣ permissions роли
    const rolePermissions = RolePolicy[user.role];

    if (!rolePermissions) {
      throw new ForbiddenException('Role has no permissions');
    }

    // 4️⃣ проверка
    const hasAllPermissions = requiredActions.every((action) => rolePermissions.includes(action));

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
