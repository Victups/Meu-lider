import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Church } from '../churches/entities/church.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamsModule } from '../teams/teams.module';
import { Invitation } from './entities/invitation.entity';
import { InvitationPreviewController, InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, Team, Church]), TeamsModule],
  controllers: [InvitationsController, InvitationPreviewController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
