import { UserResponseDto } from '../dtos/user-response.dto';
import { User } from '../entities/user.entity';

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    churchId: user.churchId,
    active: user.active,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toUserResponseList(users: User[]): UserResponseDto[] {
  return users.map(toUserResponse);
}

export function toOptionalUserResponse(user?: User | null): UserResponseDto | undefined {
  return user ? toUserResponse(user) : undefined;
}
