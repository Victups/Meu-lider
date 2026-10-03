import type { ErrorCode } from '../constants/error-code.constant';

/** Envelope returned by AllExceptionsFilter for every failed request. */
export interface ApiErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string | string[];
  timestamp: string;
  path: string;
  details?: Record<string, unknown>;
}

/** Envelope for endpoints whose only payload is a human-readable confirmation. */
export interface MessageResponse {
  message: string;
}
