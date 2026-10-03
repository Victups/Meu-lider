import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class TeamSlugAlreadyExistsException extends DomainException {
  constructor(slug: string, churchId: string) {
    super(
      ErrorCode.TEAM_SLUG_ALREADY_EXISTS,
      'Já existe uma equipe com este slug nesta igreja',
      HttpStatus.CONFLICT,
      { slug, churchId },
    );
  }
}
