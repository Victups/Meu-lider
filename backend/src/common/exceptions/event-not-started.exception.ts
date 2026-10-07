import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Attendance can only be recorded once the event has begun. */
export class EventNotStartedException extends DomainException {
  constructor() {
    super(
      ErrorCode.EVENT_NOT_STARTED,
      'A presença só pode ser ajustada depois que o evento começa',
      HttpStatus.CONFLICT,
    );
  }
}
