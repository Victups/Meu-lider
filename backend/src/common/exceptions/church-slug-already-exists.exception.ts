import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class ChurchSlugAlreadyExistsException extends DomainException {
  constructor(slug: string) {
    super(
      ErrorCode.CHURCH_SLUG_ALREADY_EXISTS,
      'Já existe uma igreja com este slug',
      HttpStatus.CONFLICT,
      { slug },
    );
  }
}
