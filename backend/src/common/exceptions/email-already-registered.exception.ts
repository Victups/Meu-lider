import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class EmailAlreadyRegisteredException extends DomainException {
  constructor(email: string) {
    super(
      ErrorCode.EMAIL_ALREADY_REGISTERED,
      'Este e-mail já está cadastrado',
      HttpStatus.CONFLICT,
      { email },
    );
  }
}
