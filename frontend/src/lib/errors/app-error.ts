export abstract class AppError extends Error {
  abstract readonly code: string;
  /** Safe to show directly to the user, in Portuguese. */
  abstract readonly userMessage: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options as ErrorOptions);
    this.name = new.target.name;
  }
}

/** The request reached the server and it answered with an error status. */
export class ApiError extends AppError {
  readonly code: string;
  readonly userMessage: string;

  constructor(
    readonly status: number,
    code: string,
    userMessage: string,
    technicalMessage?: string,
  ) {
    super(technicalMessage ?? `${status} ${code}`);
    this.code = code;
    this.userMessage = userMessage;
  }
}

/** The request never got an answer: offline, DNS failure, timeout. */
export class NetworkError extends AppError {
  readonly code = 'NETWORK_UNAVAILABLE';
  readonly userMessage = 'Sem conexão com o servidor. Verifique sua internet.';
}

/** Session is gone and could not be refreshed — the caller must sign out. */
export class SessionExpiredError extends AppError {
  readonly code = 'SESSION_EXPIRED';
  readonly userMessage = 'Sua sessão expirou. Entre novamente.';
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';

  constructor(readonly userMessage: string) {
    super(userMessage);
  }
}
