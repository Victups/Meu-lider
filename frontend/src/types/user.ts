import type { ID, ISODateString, Timestamped } from './common';

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CHURCH_ADMIN: 'CHURCH_ADMIN',
  /** Oversight: reads every team's roster without administering. */
  PASTOR: 'PASTOR',
  PRESBYTER: 'PRESBYTER',
  /** Which teams they lead comes from the team membership, not from here. */
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Administrador geral',
  CHURCH_ADMIN: 'Administrador da igreja',
  PASTOR: 'Pastor',
  PRESBYTER: 'Presbítero',
  LEADER: 'Líder de equipe',
  MEMBER: 'Membro',
};

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

const CHURCH_MANAGERS: UserRole[] = ['SUPER_ADMIN', 'CHURCH_ADMIN'];
const OVERSIGHT: UserRole[] = ['PASTOR', 'PRESBYTER'];

/**
 * Permissions are not a ladder: a pastor sees every roster but edits none,
 * while a leader edits their own team and sees no further. Ranking the roles
 * on a single scale would get one of those two wrong, so each question is
 * asked on its own.
 */
export function canManageChurch(role: UserRole): boolean {
  return CHURCH_MANAGERS.includes(role);
}

/** Reads every team's roster, whatever team it belongs to. */
export function canSeeAllRosters(role: UserRole): boolean {
  return CHURCH_MANAGERS.includes(role) || OVERSIGHT.includes(role);
}

/**
 * May reach team management at all. A leader still needs to actually lead the
 * team in question — only the API can confirm that.
 */
export function canManageSomeTeam(role: UserRole): boolean {
  return CHURCH_MANAGERS.includes(role) || role === 'LEADER';
}
