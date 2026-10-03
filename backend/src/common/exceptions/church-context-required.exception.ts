import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class ChurchContextRequiredException extends DomainException {
  constructor() {
    super(
      ErrorCode.CHURCH_CONTEXT_REQUIRED,
      'O identificador da igreja é obrigatório',
      HttpStatus.BAD_REQUEST,
    );
  }
}
