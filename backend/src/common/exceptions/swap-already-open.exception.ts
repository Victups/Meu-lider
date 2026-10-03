import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/** Two open requests for the same slot would let two people take it at once. */
export class SwapAlreadyOpenException extends DomainException {
  constructor(scheduleId: string, openSwapId: string) {
    super(
      ErrorCode.SWAP_ALREADY_OPEN,
      'Já existe um pedido de troca aberto para esta escala',
      HttpStatus.CONFLICT,
      { scheduleId, openSwapId },
    );
  }
}
