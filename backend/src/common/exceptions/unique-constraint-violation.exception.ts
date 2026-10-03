import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Translation of a PostgreSQL unique violation that no domain rule caught first. */
export class UniqueConstraintViolationException extends DomainException {
  constructor(constraint?: string) {
    super(
      ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
      'Já existe um registro com estes dados',
      HttpStatus.CONFLICT,
      { constraint },
    );
  }
}
