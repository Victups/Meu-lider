import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class EventNotRecurringException extends DomainException {
  constructor(eventId: string) {
    super(
      ErrorCode.EVENT_NOT_RECURRING,
      'Este evento não tem regra de recorrência cadastrada',
      HttpStatus.BAD_REQUEST,
      { eventId },
    );
  }
}
