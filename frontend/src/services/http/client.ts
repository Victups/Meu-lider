import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { normalizeError } from '@/lib/errors';
import type { RefreshedTokens } from '@/types';
import { tokenStorage } from './token-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const TIMEOUT_MS = 15_000;

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Set once the session is gone, so callers can route back to the login screen. */
let onSessionLost: (() => void) | null = null;

/**
 * Concurrent 401s must not each trigger a refresh: the backend rotates refresh
 * tokens, so parallel refreshes invalidate one another. The first caller owns
 * the refresh and the rest await the same promise.
 */
let inFlightRefresh: Promise<string> | null = null;

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableConfig | undefined;

    const canRetry =
      error.response?.status === 401 && request && !request._retried && Boolean(refreshToken);

    if (!canRetry) throw normalizeError(error);

    request._retried = true;

    try {
      const fresh = await refreshSession();
      request.headers.Authorization = `Bearer ${fresh}`;
      return http(request);
    } catch (refreshFailure) {
      await clearSession();
      onSessionLost?.();
      throw normalizeError(refreshFailure);
    }
  },
);

function refreshSession(): Promise<string> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    // Bare axios: going through `http` would recurse into this interceptor.
    const { data } = await axios.post<RefreshedTokens>(`${BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  })();

  return inFlightRefresh.finally(() => {
    inFlightRefresh = null;
  });
}

export function setSessionTokens(tokens: { accessToken: string; refreshToken: string }): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await tokenStorage.clear();
}

export function onSessionExpired(handler: () => void): void {
  onSessionLost = handler;
}
