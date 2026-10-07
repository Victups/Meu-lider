import type { ID, ISODateString } from './common';

export interface Invitation {
  id: ID;
  code: string;
  churchId: ID;
  teamId: ID | null;
  teamName: string | null;
  expiresAt: ISODateString;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: ISODateString;
  /** Message ready to paste into WhatsApp. */
  shareText: string;
}

export interface InvitationPreview {
  code: string;
  churchName: string;
  teamName: string | null;
}

export interface CreateInvitationInput {
  teamId?: ID;
  expiresInDays?: number;
  maxUses?: number;
}
