import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { TeamMemberRole } from './entities/team-member-role.entity';
import { TeamRole } from './entities/team-role.entity';
import { TeamRolesService } from './team-roles.service';
import { TeamRolesController } from './team-roles.controller';
import { TeamAccessService } from './team-access.service';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Team, TeamMember, TeamRole, TeamMemberRole])],
  controllers: [TeamsController, TeamRolesController],
  providers: [TeamsService, TeamRolesService, TeamAccessService],
  exports: [TeamsService, TeamRolesService, TeamAccessService],
})
export class TeamsModule {}
