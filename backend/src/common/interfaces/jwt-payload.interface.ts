import type { UserRole } from '../../modules/users/entities/user.entity';

/** Claims signed into the access and refresh tokens. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  churchId: string;
  iat?: number;
  exp?: number;
}

/** Shape produced by JwtStrategy.validate — not the full User entity. */
export interface JwtUser {
  id: string;
  email: string;
  role: UserRole;
  churchId: string;
}
