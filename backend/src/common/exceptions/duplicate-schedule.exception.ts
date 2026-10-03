import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class DuplicateScheduleException extends DomainException {
  constructor(eventId: string, teamId: string, memberId: string) {
    super(
      ErrorCode.DUPLICATE_SCHEDULE,
      'Este membro já está escalado para este evento nesta equipe',
      HttpStatus.CONFLICT,
      { eventId, teamId, memberId },
    );
  }
}
