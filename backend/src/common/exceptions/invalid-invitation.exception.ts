import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Unknown, expired, revoked or exhausted invitation code. */
export class InvalidInvitationException extends DomainException {
  constructor(message = 'Convite inválido ou expirado. Peça um novo código ao seu líder.') {
    super(ErrorCode.INVALID_INVITATION, message, HttpStatus.BAD_REQUEST);
  }
}
