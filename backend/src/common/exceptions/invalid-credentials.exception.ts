import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Credenciais inválidas', HttpStatus.UNAUTHORIZED);
  }
}
