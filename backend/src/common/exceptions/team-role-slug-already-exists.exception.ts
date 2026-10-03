import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class TeamRoleSlugAlreadyExistsException extends DomainException {
  constructor(slug: string, teamId: string) {
    super(
      ErrorCode.TEAM_ROLE_SLUG_ALREADY_EXISTS,
      'Já existe uma função com este slug nesta equipe',
      HttpStatus.CONFLICT,
      { slug, teamId },
    );
  }
}
