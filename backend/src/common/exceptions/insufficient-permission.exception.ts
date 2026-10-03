import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InsufficientPermissionException extends DomainException {
  constructor(
    message = 'Você não tem permissão para executar esta ação',
    details?: Record<string, unknown>,
  ) {
    super(ErrorCode.INSUFFICIENT_PERMISSION, message, HttpStatus.FORBIDDEN, details);
  }
}
