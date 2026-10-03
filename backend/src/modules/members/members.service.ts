import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceType } from '../../common/constants';
import { ResourceNotFoundException } from '../../common/exceptions';
import { CreateMemberDto } from './dtos/create-member.dto';
import { MemberResponseDto } from './dtos/member-response.dto';
import { UpdateMemberDto } from './dtos/update-member.dto';
import { Member } from './entities/member.entity';
import type { IMembersService } from './interfaces/members-service.interface';
import {
  toMemberResponse,
  toMemberResponseList,
  toOptionalMemberResponse,
} from './mappers/member.mapper';

@Injectable()
export class MembersService implements IMembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<MemberResponseDto> {
    const member = this.membersRepository.create(createMemberDto);
    return toMemberResponse(await this.membersRepository.save(member));
  }

  async findOne(id: string): Promise<MemberResponseDto> {
    return toMemberResponse(await this.findMemberEntity(id));
  }

  async findByChurch(churchId: string): Promise<MemberResponseDto[]> {
    const members = await this.membersRepository.find({
      where: { churchId },
      relations: { user: true, teamMemberships: true },
    });

    return toMemberResponseList(members);
  }

  async findByUserId(userId: string): Promise<MemberResponseDto | null> {
    const member = await this.membersRepository.findOne({
      where: { userId },
      relations: { user: true, teamMemberships: true },
    });

    return toOptionalMemberResponse(member) ?? null;
  }

  async update(id: string, updateData: UpdateMemberDto): Promise<MemberResponseDto> {
    const member = await this.findMemberEntity(id);

    Object.assign(member, updateData);
    return toMemberResponse(await this.membersRepository.save(member));
  }

  private async findMemberEntity(id: string): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: { user: true, teamMemberships: true, schedules: true },
    });

    if (!member) {
      throw new ResourceNotFoundException(ResourceType.MEMBER, id);
    }

    return member;
  }
}
