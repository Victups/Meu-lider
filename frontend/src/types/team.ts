import type { ID, ISODateString, Timestamped } from './common';
import type { Member } from './member';

export interface Team extends Timestamped {
  id: ID;
  churchId: ID;
  name: string;
  slug: string;
  description: string | null;
  /** Hex colour used to tint the team across the UI. */
  color: string | null;
  active: boolean;
  members?: TeamMember[];
}

/** A position inside a team: "Vocal", "Baixo", "Fotógrafo". */
export interface TeamRole extends Timestamped {
  id: ID;
  teamId: ID;
  name: string;
  slug: string;
  color: string | null;
  /** How many people this position normally needs per event. */
  defaultSlots: number;
  active: boolean;
}

export interface CreateTeamRoleInput {
  name: string;
  slug?: string;
  color?: string;
  defaultSlots?: number;
}

export interface TeamMember extends Timestamped {
  id: ID;
  teamId: ID;
  memberId: ID;
  role: string | null;
  startedAt: ISODateString | null;
  endedAt: ISODateString | null;
  isLeader: boolean;
  member?: Member;
}

export interface CreateTeamInput {
  churchId: ID;
  name: string;
  slug: string;
  description?: string;
  color?: string;
}
