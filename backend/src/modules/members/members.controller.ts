import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { MANAGER_ROLES } from '../../common/constants';
import { Roles } from '../../common/decorators';
import { ChurchGuard, JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CreateMemberDto } from './dtos/create-member.dto';
import { MemberResponseDto } from './dtos/member-response.dto';
import { UpdateMemberDto } from './dtos/update-member.dto';
import { MembersService } from './members.service';

@Controller('churches/:churchId/members')
@UseGuards(JwtAuthGuard, ChurchGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findByChurch(@Param('churchId') churchId: string): Promise<MemberResponseDto[]> {
    return this.membersService.findByChurch(churchId);
  }

  @Roles(...MANAGER_ROLES)
  @Post()
  create(
    @Param('churchId') churchId: string,
    @Body() createMemberDto: CreateMemberDto,
  ): Promise<MemberResponseDto> {
    createMemberDto.churchId = churchId;
    return this.membersService.create(createMemberDto);
  }

  @Get(':memberId')
  findOne(@Param('memberId') id: string): Promise<MemberResponseDto> {
    return this.membersService.findOne(id);
  }

  @Roles(...MANAGER_ROLES)
  @Put(':memberId')
  update(
    @Param('memberId') id: string,
    @Body() updateData: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.update(id, updateData);
  }
}
