import type { AuthSession, LoginInput, RegisterInput } from '@/types';
import { clearSession, http, setSessionTokens } from './http/client';
import { tokenStorage, type StoredSession } from './http/token-storage';

export const authService = {
  async login(input: LoginInput): Promise<AuthSession> {
    const { data } = await http.post<AuthSession>('/auth/login', input);
    await persist(data);
    return data;
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    const { data } = await http.post<AuthSession>('/auth/register', input);
    await persist(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout');
    } finally {
      await clearSession();
    }
  },

  /** Rehydrates tokens from secure storage on cold start. */
  async restore(): Promise<StoredSession | null> {
    const stored = await tokenStorage.read();
    if (stored) setSessionTokens(stored);
    return stored;
  },
};

async function persist(session: AuthSession): Promise<void> {
  setSessionTokens(session);
  await tokenStorage.save({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  });
}
