import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class InvalidRecurrenceRuleException extends DomainException {
  constructor(rule: string, problem: string) {
    super(
      ErrorCode.INVALID_RECURRENCE_RULE,
      `Regra de recorrência inválida: ${problem}`,
      HttpStatus.BAD_REQUEST,
      { rule, problem },
    );
  }
}
