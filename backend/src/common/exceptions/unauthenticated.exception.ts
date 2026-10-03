import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class UnauthenticatedException extends DomainException {
  constructor() {
    super(ErrorCode.UNAUTHENTICATED, 'Autenticação obrigatória', HttpStatus.UNAUTHORIZED);
  }
}
