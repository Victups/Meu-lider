import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InvalidScheduleTransitionException extends DomainException {
  constructor(message = 'Esta mudança de status não é permitida') {
    super(ErrorCode.INVALID_SCHEDULE_TRANSITION, message, HttpStatus.CONFLICT);
  }
}
