import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/entities/user.entity';
import { ROLES_METADATA_KEY } from '../constants';
import { InsufficientPermissionException, UnauthenticatedException } from '../exceptions';
import type { AuthenticatedRequest } from '../interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new UnauthenticatedException();
    }

    if (!requiredRoles.includes(user.role)) {
      throw new InsufficientPermissionException(undefined, { requiredRoles, role: user.role });
    }

    return true;
  }
}
