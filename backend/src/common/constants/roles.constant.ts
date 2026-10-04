import { UserRole } from '../../modules/users/entities/user.entity';

/** Administers the church: creates teams, events and positions. */
export const CHURCH_MANAGER_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CHURCH_ADMIN,
];

/**
 * Oversight roles. They read every team's roster without administering, so
 * pastors and presbyters never need an admin account to see the whole picture.
 */
export const OVERSIGHT_ROLES: readonly UserRole[] = [UserRole.PASTOR, UserRole.PRESBYTER];

/** Allowed to reach team and event management endpoints at all. */
export const MANAGER_ROLES: readonly UserRole[] = [
  ...CHURCH_MANAGER_ROLES,
  UserRole.LEADER,
];

/** Sees every roster of the church, whatever team it belongs to. */
export const FULL_VISIBILITY_ROLES: readonly UserRole[] = [
  ...CHURCH_MANAGER_ROLES,
  ...OVERSIGHT_ROLES,
];
