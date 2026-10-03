import type { ID, ISODateString, Timestamped } from './common';

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CHURCH_ADMIN: 'CHURCH_ADMIN',
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User extends Timestamped {
  id: ID;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  churchId: ID;
  active: boolean;
  lastLoginAt: ISODateString | null;
}

const RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 3,
  CHURCH_ADMIN: 2,
  LEADER: 1,
  MEMBER: 0,
};

export function hasAtLeastRole(role: UserRole, required: UserRole): boolean {
  return RANK[role] >= RANK[required];
}
