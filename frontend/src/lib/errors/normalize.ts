import axios from 'axios';
import type { ApiErrorBody } from '../../types/api';
import { ApiError, AppError, NetworkError, SessionExpiredError } from './app-error';

const MESSAGE_BY_STATUS: Record<number, string> = {
  400: 'Dados inválidos. Revise as informações e tente de novo.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procura.',
  409: 'Esse registro já existe.',
  422: 'Dados inválidos. Revise as informações e tente de novo.',
  500: 'Erro no servidor. Tente novamente em instantes.',
};

/**
 * class-validator reports one message per failed rule, so the API's `message`
 * is an array on 400s and a plain string everywhere else.
 */
function readMessage(message: string | string[] | undefined): string | undefined {
  if (Array.isArray(message)) return message.length > 0 ? message.join('. ') : undefined;
  return message;
}

/** Turns anything thrown by the HTTP layer into a typed AppError. */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) return new NetworkError(error.message, { cause: error });

    const { status, data } = error.response;
    if (status === 401) return new SessionExpiredError(error.message, { cause: error });

    const body = data as Partial<ApiErrorBody> | undefined;
    return new ApiError(
      status,
      body?.errorCode ?? `HTTP_${status}`,
      readMessage(body?.message) ?? MESSAGE_BY_STATUS[status] ?? 'Algo deu errado. Tente novamente.',
      error.message,
    );
  }

  return new ApiError(
    0,
    'UNKNOWN',
    'Algo deu errado. Tente novamente.',
    error instanceof Error ? error.message : String(error),
  );
}

export function toUserMessage(error: unknown): string {
  return normalizeError(error).userMessage;
}
