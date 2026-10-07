import type {
  AuthSession,
  ChangePasswordInput,
  LoginInput,
  RefreshedTokens,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
  User,
} from '@/types';
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
      // The device must stop receiving this user's pushes before the token dies.
      await http.post('/notifications/remove-token').catch(() => undefined);
      await http.post('/auth/logout');
    } finally {
      await clearSession();
    }
  },

  /** Fresh copy of the account: roles change on the server (a leader was just appointed). */
  async me(): Promise<User> {
    const { data } = await http.get<User>('/auth/me');
    const stored = await tokenStorage.read();
    if (stored) await tokenStorage.save({ ...stored, user: data });
    return data;
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const { data } = await http.patch<User>('/auth/me', input);
    const stored = await tokenStorage.read();
    if (stored) await tokenStorage.save({ ...stored, user: data });
    return data;
  },

  /** Ends the other sessions; the API hands back fresh tokens for this one. */
  async changePassword(input: ChangePasswordInput): Promise<void> {
    const { data } = await http.post<RefreshedTokens>('/auth/change-password', input);
    setSessionTokens(data);
    await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
  },

  async forgotPassword(email: string): Promise<void> {
    await http.post('/auth/forgot-password', { email });
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await http.post('/auth/reset-password', input);
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
