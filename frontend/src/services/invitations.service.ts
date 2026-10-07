import type { CreateInvitationInput, ID, Invitation, InvitationPreview } from '@/types';
import { http } from './http/client';

export const invitationsService = {
  async list(churchId: ID): Promise<Invitation[]> {
    const { data } = await http.get<Invitation[]>(`/churches/${churchId}/invitations`);
    return data;
  },

  async create(churchId: ID, input: CreateInvitationInput): Promise<Invitation> {
    const { data } = await http.post<Invitation>(`/churches/${churchId}/invitations`, input);
    return data;
  },

  async revoke(churchId: ID, invitationId: ID): Promise<void> {
    await http.delete(`/churches/${churchId}/invitations/${invitationId}`);
  },

  /** Public: used before the account exists. */
  async preview(code: string): Promise<InvitationPreview> {
    const { data } = await http.get<InvitationPreview>(`/invitations/${encodeURIComponent(code)}`);
    return data;
  },
};
