import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';

export interface DomainExceptionBody {
  errorCode: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export abstract class DomainException extends HttpException {
  readonly errorCode: ErrorCode;
  readonly details?: Record<string, unknown>;

  protected constructor(
    errorCode: ErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    const body: DomainExceptionBody = { errorCode, message, details };
    super(body, status);

    this.errorCode = errorCode;
    this.details = details;
    this.name = new.target.name;
  }
}
