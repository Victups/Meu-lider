import type { UserRole } from '../entities/user.entity';

/** Public projection of User — never carries `passwordHash`. */
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  churchId: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
