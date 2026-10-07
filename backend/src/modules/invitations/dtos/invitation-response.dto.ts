export class InvitationResponseDto {
  id: string;
  code: string;
  churchId: string;
  teamId: string | null;
  teamName: string | null;
  expiresAt: Date;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: Date;
  /** Message ready to paste into WhatsApp. */
  shareText: string;
}

/** What a newcomer sees after typing the code, before creating the account. */
export class InvitationPreviewDto {
  code: string;
  churchName: string;
  teamName: string | null;
}
