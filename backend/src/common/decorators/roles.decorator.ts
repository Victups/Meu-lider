import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { ROLES_METADATA_KEY } from '../constants';
import type { UserRole } from '../../modules/users/entities/user.entity';

export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_METADATA_KEY, roles);
