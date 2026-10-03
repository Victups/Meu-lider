import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';
import { DomainException } from './domain.exception';

/**
 * The person trying to take over the slot fails one of the hand-over rules:
 * wrong team, does not cover the position, or already booked for the event.
 */
export class InvalidSwapCandidateException extends DomainException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.INVALID_SWAP_CANDIDATE, message, HttpStatus.CONFLICT, details);
  }
}
