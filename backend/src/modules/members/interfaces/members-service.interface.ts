import type { CreateMemberDto } from '../dtos/create-member.dto';
import type { MemberResponseDto } from '../dtos/member-response.dto';
import type { UpdateMemberDto } from '../dtos/update-member.dto';

export interface IMembersService {
  create(createMemberDto: CreateMemberDto): Promise<MemberResponseDto>;
  findOne(id: string): Promise<MemberResponseDto>;
  findByChurch(churchId: string): Promise<MemberResponseDto[]>;
  findByUserId(userId: string): Promise<MemberResponseDto | null>;
  update(id: string, updateData: UpdateMemberDto): Promise<MemberResponseDto>;
}
