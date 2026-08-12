import { create } from 'zustand';
import { User } from '../lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setSession: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('reelforge_user') ?? 'null'),
  token: localStorage.getItem('reelforge_token'),
  setSession: (user, token) => {
    localStorage.setItem('reelforge_user', JSON.stringify(user));
    localStorage.setItem('reelforge_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('reelforge_user');
    localStorage.removeItem('reelforge_token');
    set({ user: null, token: null });
  },
}));
