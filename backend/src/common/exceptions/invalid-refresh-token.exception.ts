import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InvalidRefreshTokenException extends DomainException {
  constructor(message = 'Refresh token inválido') {
    super(ErrorCode.INVALID_REFRESH_TOKEN, message, HttpStatus.UNAUTHORIZED);
  }
}
