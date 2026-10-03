import type { MemberResponseDto } from '../../members/dtos/member-response.dto';
import type { TeamResponseDto } from '../../teams/dtos/team-response.dto';
import type { UserResponseDto } from '../../users/dtos/user-response.dto';

export class ChurchResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  website: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  users?: UserResponseDto[];
  teams?: TeamResponseDto[];
  members?: MemberResponseDto[];
}
