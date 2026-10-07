import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InvalidResetCodeException extends DomainException {
  constructor() {
    super(
      ErrorCode.INVALID_RESET_CODE,
      'Código inválido ou expirado. Peça um novo código.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
