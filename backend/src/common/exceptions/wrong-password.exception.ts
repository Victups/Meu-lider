import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class WrongPasswordException extends DomainException {
  constructor() {
    super(ErrorCode.WRONG_PASSWORD, 'A senha atual está incorreta', HttpStatus.BAD_REQUEST);
  }
}
