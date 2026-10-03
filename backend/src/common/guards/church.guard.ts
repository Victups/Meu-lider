import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';
import {
  ChurchAccessDeniedException,
  ChurchContextRequiredException,
  UnauthenticatedException,
} from '../exceptions';
import type { AuthenticatedRequest } from '../interfaces';

@Injectable()
export class ChurchGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const churchId: unknown = request.params?.churchId ?? request.body?.churchId;

    if (!user) {
      throw new UnauthenticatedException();
    }

    if (typeof churchId !== 'string' || churchId.length === 0) {
      throw new ChurchContextRequiredException();
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (user.churchId !== churchId) {
      throw new ChurchAccessDeniedException(churchId);
    }

    return true;
  }
}
