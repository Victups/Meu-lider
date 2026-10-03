import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Raised when a user reaches data that belongs to another tenant (church). */
export class ChurchAccessDeniedException extends DomainException {
  constructor(churchId?: string) {
    super(
      ErrorCode.CHURCH_ACCESS_DENIED,
      'Você não tem acesso a esta igreja',
      HttpStatus.FORBIDDEN,
      { churchId },
    );
  }
}
