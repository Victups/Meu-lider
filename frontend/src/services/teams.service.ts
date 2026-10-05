import type {
  CreateTeamInput,
  CreateTeamRoleInput,
  ID,
  Team,
  TeamMember,
  TeamMemberRoleLink,
  TeamRole,
} from '@/types';
import { http } from './http/client';

export const teamsService = {
  async list(churchId: ID): Promise<Team[]> {
    const { data } = await http.get<Team[]>(`/churches/${churchId}/teams`);
    return data;
  },

  async getById(churchId: ID, teamId: ID): Promise<Team> {
    const { data } = await http.get<Team>(`/churches/${churchId}/teams/${teamId}`);
    return data;
  },

  async create(churchId: ID, input: CreateTeamInput): Promise<Team> {
    const { data } = await http.post<Team>(`/churches/${churchId}/teams`, input);
    return data;
  },

  async update(churchId: ID, teamId: ID, input: Partial<CreateTeamInput>): Promise<Team> {
    const { data } = await http.put<Team>(`/churches/${churchId}/teams/${teamId}`, input);
    return data;
  },

  async listMembers(churchId: ID, teamId: ID): Promise<TeamMember[]> {
    const { data } = await http.get<TeamMember[]>(`/churches/${churchId}/teams/${teamId}/members`);
    return data;
  },

  async addMember(churchId: ID, teamId: ID, memberId: ID): Promise<TeamMember> {
    const { data } = await http.post<TeamMember>(
      `/churches/${churchId}/teams/${teamId}/members/${memberId}`,
    );
    return data;
  },

  async removeMember(churchId: ID, teamId: ID, memberId: ID): Promise<void> {
    await http.delete(`/churches/${churchId}/teams/${teamId}/members/${memberId}`);
  },

  async listRoles(churchId: ID, teamId: ID): Promise<TeamRole[]> {
    const { data } = await http.get<TeamRole[]>(`/churches/${churchId}/teams/${teamId}/roles`);
    return data;
  },

  async createRole(churchId: ID, teamId: ID, input: CreateTeamRoleInput): Promise<TeamRole> {
    const { data } = await http.post<TeamRole>(
      `/churches/${churchId}/teams/${teamId}/roles`,
      input,
    );
    return data;
  },

  async removeRole(churchId: ID, teamId: ID, roleId: ID): Promise<void> {
    await http.delete(`/churches/${churchId}/teams/${teamId}/roles/${roleId}`);
  },

  /** The API returns the link rows, each wrapping the position it points to. */
  async listMemberRoles(churchId: ID, teamId: ID, memberId: ID): Promise<TeamRole[]> {
    const { data } = await http.get<TeamMemberRoleLink[]>(
      `/churches/${churchId}/teams/${teamId}/members/${memberId}/roles`,
    );
    return data.map((link) => link.teamRole).filter((role): role is TeamRole => Boolean(role));
  },

  async assignMemberRole(
    churchId: ID,
    teamId: ID,
    memberId: ID,
    teamRoleId: ID,
    isPrimary = false,
  ): Promise<void> {
    await http.post(
      `/churches/${churchId}/teams/${teamId}/members/${memberId}/roles/${teamRoleId}`,
      { isPrimary },
    );
  },

  async unassignMemberRole(
    churchId: ID,
    teamId: ID,
    memberId: ID,
    teamRoleId: ID,
  ): Promise<void> {
    await http.delete(
      `/churches/${churchId}/teams/${teamId}/members/${memberId}/roles/${teamRoleId}`,
    );
  },
};
