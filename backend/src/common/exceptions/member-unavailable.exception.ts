import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class MemberUnavailableException extends DomainException {
  constructor(memberId: string, date: Date) {
    super(
      ErrorCode.MEMBER_UNAVAILABLE,
      'O membro informou indisponibilidade para esta data',
      HttpStatus.CONFLICT,
      { memberId, date: date.toISOString() },
    );
  }
}
