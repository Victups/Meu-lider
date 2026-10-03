import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

export class SwapNotOpenException extends DomainException {
  constructor(swapId: string, status: string) {
    super(
      ErrorCode.SWAP_NOT_OPEN,
      'Este pedido de troca já foi respondido',
      HttpStatus.CONFLICT,
      { swapId, status },
    );
  }
}
