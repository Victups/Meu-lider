import type { TeamMemberResponseDto } from './team-member-response.dto';

export class TeamResponseDto {
  id: string;
  churchId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  members?: TeamMemberResponseDto[];
}
