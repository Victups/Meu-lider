import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Raised when a position from another team is used, e.g. "Fotógrafo" inside Louvor. */
export class TeamRoleNotInTeamException extends DomainException {
  constructor(teamRoleId: string, teamId: string) {
    super(
      ErrorCode.TEAM_ROLE_NOT_IN_TEAM,
      'Esta função não pertence a esta equipe',
      HttpStatus.BAD_REQUEST,
      { teamRoleId, teamId },
    );
  }
}
