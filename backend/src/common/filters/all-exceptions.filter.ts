import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { ErrorCode, PG_ERROR_CODES } from '../constants';
import { DomainException } from '../exceptions';
import type { ApiErrorResponse } from '../interfaces';

interface PostgresDriverError extends Error {
  code?: string;
  constraint?: string;
}

interface ResolvedError {
  status: number;
  errorCode: ErrorCode;
  message: string | string[];
  details?: Record<string, unknown>;
}

const HTTP_STATUS_ERROR_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const resolved = this.resolve(exception);

    const body: ApiErrorResponse = {
      statusCode: resolved.status,
      errorCode: resolved.errorCode,
      message: resolved.message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(resolved.details ? { details: resolved.details } : {}),
    };

    this.log(exception, request, resolved);
    response.status(resolved.status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof DomainException) {
      return {
        status: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }

    if (exception instanceof QueryFailedError) {
      return this.resolveQueryFailed(exception);
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Registro não encontrado',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    };
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const message = this.extractMessage(payload, exception.message);

    const isValidationFailure = status === HttpStatus.BAD_REQUEST && Array.isArray(message);

    return {
      status,
      errorCode: isValidationFailure
        ? ErrorCode.VALIDATION_FAILED
        : (HTTP_STATUS_ERROR_CODES[status] ?? ErrorCode.INTERNAL_SERVER_ERROR),
      message,
    };
  }

  private resolveQueryFailed(exception: QueryFailedError): ResolvedError {
    const driverError = exception.driverError as PostgresDriverError;

    switch (driverError?.code) {
      case PG_ERROR_CODES.UNIQUE_VIOLATION:
        return {
          status: HttpStatus.CONFLICT,
          errorCode: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
          message: 'Já existe um registro com estes dados',
          details: { constraint: driverError.constraint },
        };
      case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        return {
          status: HttpStatus.CONFLICT,
          errorCode: ErrorCode.FOREIGN_KEY_VIOLATION,
          message: 'Registro relacionado inexistente ou ainda em uso',
          details: { constraint: driverError.constraint },
        };
      case PG_ERROR_CODES.NOT_NULL_VIOLATION:
        return {
          status: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCode.NOT_NULL_VIOLATION,
          message: 'Campo obrigatório não informado',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: ErrorCode.DATABASE_ERROR,
          message: 'Erro ao acessar os dados',
        };
    }
  }

  private extractMessage(payload: unknown, fallback: string): string | string[] {
    if (typeof payload === 'string') {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message: unknown };
      if (typeof message === 'string' || Array.isArray(message)) {
        return message as string | string[];
      }
    }

    return fallback;
  }

  private log(exception: unknown, request: Request, resolved: ResolvedError): void {
    const context = `${request.method} ${request.url} -> ${resolved.status} ${resolved.errorCode}`;

    if (resolved.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(context, exception instanceof Error ? exception.stack : String(exception));
      return;
    }

    this.logger.warn(context);
  }
}
