import { create } from 'zustand';
import { authService } from '@/services';
import { hasAtLeastRole, type LoginInput, type RegisterInput, type User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreSession: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  canManageTeams: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  restoreSession: async () => {
    try {
      const stored = await authService.restore();
      set({ user: stored?.user ?? null, isAuthenticated: Boolean(stored), isLoading: false });
    } catch {
      // A broken or unreadable store must not block boot — fall back to login.
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  signIn: async (input) => {
    const session = await authService.login(input);
    set({ user: session.user, isAuthenticated: true, isLoading: false });
  },

  signUp: async (input) => {
    const session = await authService.register(input);
    set({ user: session.user, isAuthenticated: true, isLoading: false });
  },

  signOut: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  isAdmin: () => {
    const { user } = get();
    return user ? hasAtLeastRole(user.role, 'CHURCH_ADMIN') : false;
  },

  canManageTeams: () => {
    const { user } = get();
    return user ? hasAtLeastRole(user.role, 'LEADER') : false;
  },
}));
