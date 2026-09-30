import { create } from 'zustand';
import type { User, LoginResponse } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('sani_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('sani_token'),
  isAuthenticated: !!localStorage.getItem('sani_token'),
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('sani_token', data.access_token);
      const user: User = {
        id: data.user_id,
        username: data.username,
        email: '',
        full_name: data.full_name,
        role: data.role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('sani_user', JSON.stringify(user));
      set({ user, token: data.access_token, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout network errors and clear local state anyway
    } finally {
      localStorage.removeItem('sani_token');
      localStorage.removeItem('sani_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('sani_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }
    try {
      const user = await authApi.getMe();
      localStorage.setItem('sani_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      localStorage.removeItem('sani_token');
      localStorage.removeItem('sani_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
