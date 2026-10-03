import type { ID } from './common';
import type { User } from './user';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  churchId: ID;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
