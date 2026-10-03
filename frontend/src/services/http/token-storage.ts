import type { User } from '@/types';
import { secureStorage } from './secure-storage';

const ACCESS_TOKEN = 'accessToken';
const REFRESH_TOKEN = 'refreshToken';
const SESSION_USER = 'sessionUser';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const tokenStorage = {
  async save(session: StoredSession): Promise<void> {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN, session.accessToken),
      secureStorage.setItem(REFRESH_TOKEN, session.refreshToken),
      secureStorage.setItem(SESSION_USER, JSON.stringify(session.user)),
    ]);
  },

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN, accessToken),
      secureStorage.setItem(REFRESH_TOKEN, refreshToken),
    ]);
  },

  async read(): Promise<StoredSession | null> {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN),
      secureStorage.getItem(REFRESH_TOKEN),
      secureStorage.getItem(SESSION_USER),
    ]);

    if (!accessToken || !refreshToken || !rawUser) return null;

    try {
      return { accessToken, refreshToken, user: JSON.parse(rawUser) as User };
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await Promise.all([
      secureStorage.removeItem(ACCESS_TOKEN),
      secureStorage.removeItem(REFRESH_TOKEN),
      secureStorage.removeItem(SESSION_USER),
    ]);
  },
};
