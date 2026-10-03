export class TeamRoleResponseDto {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  color: string | null;
  defaultSlots: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
